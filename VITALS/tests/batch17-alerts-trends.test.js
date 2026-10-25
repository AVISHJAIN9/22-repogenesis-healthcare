process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcrypt');
const { app } = require('../app');
const User = require('../models/User');

let mongoServer;
let clinicianToken;
let patientId;
let caseId;

async function createClinician(username, tenantId = 'default') {
  const user = await User.create({
    username,
    password: await bcrypt.hash('Secret123', 10),
    name: username,
    role: 'clinician',
    tenantId,
    permissions: ['patient:read', 'patient:write', 'clinical:read', 'clinical:write']
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'Secret123' });

  return { user, token: loginRes.body.token };
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);

  const clinician = await createClinician('batch17doctor', 'default');
  clinicianToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Seventeen',
      email: 'batch17@example.com',
      phone: '9876543217',
      dateOfBirth: '1992-06-18',
      gender: 'Male',
      address: 'Bengaluru',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Mobility worsening',
      treatmentGoal: 'Reduce pain and improve function',
      clinicalNotes: 'Case staged for alerting and trend monitoring'
    });

  caseId = caseRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/alerts/progress-score and summary/trend endpoints return rule-based alerting data', async () => {
  const scoreRes = await request(app)
    .post('/api/alerts/progress-score')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      score: 74,
      baselineScore: 58,
      category: 'mobility',
      windowLabel: 'Week 6',
      notes: 'Improving functional status'
    });

  assert.equal(scoreRes.status, 201);
  assert.equal(scoreRes.body.success, true);
  assert.equal(scoreRes.body.data.score, 74);
  assert.equal(scoreRes.body.data.category, 'mobility');

  const alertRes = await request(app)
    .post('/api/alerts')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      type: 'follow_up',
      severity: 'warning',
      title: 'Review mobility progress',
      message: 'Score improved but still below target range.'
    });

  assert.equal(alertRes.status, 201);
  assert.equal(alertRes.body.success, true);
  assert.equal(alertRes.body.data.title, 'Review mobility progress');

  const acknowledgeRes = await request(app)
    .patch(`/api/alerts/${alertRes.body.data._id}/acknowledge`)
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({ acknowledgedBy: 'Dr. Singh' });

  assert.equal(acknowledgeRes.status, 200);
  assert.equal(acknowledgeRes.body.success, true);
  assert.equal(acknowledgeRes.body.data.status, 'acknowledged');

  const summaryRes = await request(app)
    .get(`/api/alerts/patient/${patientId}/summary`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.success, true);
  assert.ok(summaryRes.body.data.summary.totalAlerts >= 1);
  assert.ok(summaryRes.body.data.summary.latestProgressScore >= 70);

  const trendRes = await request(app)
    .get(`/api/alerts/patient/${patientId}/trends`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(trendRes.status, 200);
  assert.equal(trendRes.body.success, true);
  assert.ok(Array.isArray(trendRes.body.data.trends));
  assert.ok(trendRes.body.data.trendSummary.hasImprovement === true || trendRes.body.data.trendSummary.hasImprovement === false);
});
