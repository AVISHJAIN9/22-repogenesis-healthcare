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

  const clinician = await createClinician('batch16doctor', 'default');
  clinicianToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Sixteen',
      email: 'batch16@example.com',
      phone: '9876543215',
      dateOfBirth: '1989-09-01',
      gender: 'Female',
      address: 'Chennai',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Mobility limitation',
      treatmentGoal: 'Functional recovery',
      clinicalNotes: 'Monitoring after therapy'
    });

  caseId = caseRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/outcomes/pros, clinical, adverse-events and summary endpoint', async () => {
  const proRes = await request(app)
    .post('/api/outcomes/pros')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      instrument: 'PROMIS Mobility',
      score: 68,
      completionDate: '2026-10-28T00:00:00.000Z',
      notes: 'Improvement since previous assessment'
    });

  assert.equal(proRes.status, 201);
  assert.equal(proRes.body.success, true);
  assert.equal(proRes.body.data.instrument, 'PROMIS Mobility');

  const clinicalRes = await request(app)
    .post('/api/outcomes/clinical')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      outcomeType: 'range_of_motion',
      value: 78,
      unit: '%',
      assessedAt: '2026-10-28T00:00:00.000Z',
      evaluator: 'Dr. Mehta'
    });

  assert.equal(clinicalRes.status, 201);
  assert.equal(clinicalRes.body.success, true);
  assert.equal(clinicalRes.body.data.outcomeType, 'range_of_motion');

  const adverseRes = await request(app)
    .post('/api/outcomes/adverse-events')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      eventType: 'local_swelling',
      severity: 'moderate',
      description: 'Localized swelling around injection site',
      detectedAt: '2026-10-28T00:00:00.000Z'
    });

  assert.equal(adverseRes.status, 201);
  assert.equal(adverseRes.body.success, true);
  assert.equal(adverseRes.body.data.eventType, 'local_swelling');

  const summaryRes = await request(app)
    .get(`/api/outcomes/patient/${patientId}/summary`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.success, true);
  assert.ok(summaryRes.body.data.summary.totalPros >= 1);
  assert.ok(summaryRes.body.data.summary.totalClinicalOutcomes >= 1);
  assert.ok(summaryRes.body.data.summary.totalAdverseEvents >= 1);
});
