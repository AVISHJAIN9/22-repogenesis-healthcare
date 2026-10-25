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

  const clinician = await createClinician('batch15doctor', 'default');
  clinicianToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Fifteen',
      email: 'batch15@example.com',
      phone: '9876543214',
      dateOfBirth: '1986-02-14',
      gender: 'Male',
      address: 'Delhi',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Post-injury recovery',
      treatmentGoal: 'Return to function',
      clinicalNotes: 'Suitable for monitoring cycle'
    });

  caseId = caseRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/monitoring/plans and follow-ups create monitoring records', async () => {
  const planRes = await request(app)
    .post('/api/monitoring/plans')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      planName: '12-week recovery tracking',
      status: 'active',
      followUpIntervalDays: 14,
      notes: 'Hybrid monitoring plan'
    });

  assert.equal(planRes.status, 201);
  assert.equal(planRes.body.success, true);
  assert.equal(planRes.body.data.planName, '12-week recovery tracking');

  const followUpRes = await request(app)
    .post('/api/monitoring/follow-ups')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      monitoringPlanId: planRes.body.data._id,
      scheduledFor: '2026-11-02T10:00:00.000Z',
      type: 'check-in',
      status: 'scheduled'
    });

  assert.equal(followUpRes.status, 201);
  assert.equal(followUpRes.body.success, true);
  assert.equal(followUpRes.body.data.type, 'check-in');
});

test('POST /api/monitoring/safety-warnings and GET /api/monitoring/patient/:patientId/summary', async () => {
  const warningRes = await request(app)
    .post('/api/monitoring/safety-warnings')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      severity: 'warning',
      title: 'Medication review required',
      description: 'Review patient medicines before final approval',
      status: 'active'
    });

  assert.equal(warningRes.status, 201);
  assert.equal(warningRes.body.success, true);
  assert.equal(warningRes.body.data.title, 'Medication review required');

  const summaryRes = await request(app)
    .get(`/api/monitoring/patient/${patientId}/summary`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.success, true);
  assert.ok(summaryRes.body.data.summary.totalMonitoringPlans >= 1);
  assert.ok(summaryRes.body.data.summary.totalWarnings >= 1);
});
