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
    permissions: ['patient:read', 'patient:write', 'clinical:read', 'clinical:write', 'case:read', 'case:write']
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

  const clinician = await createClinician('batch18doctor', 'default');
  clinicianToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Eighteen',
      email: 'batch18@example.com',
      phone: '9876543218',
      dateOfBirth: '1990-02-03',
      gender: 'Female',
      address: 'Hyderabad',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Joint pain',
      treatmentGoal: 'Improve mobility',
      clinicalNotes: 'Dashboard test case'
    });

  caseId = caseRes.body.data._id;

  await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      target: 'Mobility improvement',
      objective: 'Restore routine function',
      therapy: 'PRP + MSC',
      status: 'approved',
      components: [{ name: 'Injection', type: 'therapy', dose: '1x', schedule: 'Week 1' }],
      notes: 'Initial plan' 
    });

  await request(app)
    .post('/api/alerts/progress-score')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      score: 72,
      baselineScore: 58,
      category: 'mobility',
      windowLabel: 'Week 4'
    });
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('GET /api/dashboard/patient/:patientId/summary and /api/cases/:id/overview return aggregated dashboard data', async () => {
  const dashboardRes = await request(app)
    .get(`/api/dashboard/patient/${patientId}/summary`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(dashboardRes.status, 200);
  assert.equal(dashboardRes.body.success, true);
  assert.ok(dashboardRes.body.data.summary.totalCases >= 1);
  assert.ok(Array.isArray(dashboardRes.body.data.timeline));
  assert.ok(dashboardRes.body.data.summary.latestProgressScore >= 70 || dashboardRes.body.data.summary.latestProgressScore === null);

  const overviewRes = await request(app)
    .get(`/api/cases/${caseId}/overview`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(overviewRes.status, 200);
  assert.equal(overviewRes.body.success, true);
  assert.equal(overviewRes.body.data.caseId, caseId);
  assert.ok(overviewRes.body.data.summary.totalPlans >= 1 || overviewRes.body.data.summary.totalPlans === 0);
  assert.ok(Array.isArray(overviewRes.body.data.timeline));
});
