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
let planId;

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

  const clinician = await createClinician('batch14doctor', 'default');
  clinicianToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Fourteen',
      email: 'batch14@example.com',
      phone: '9876543213',
      dateOfBirth: '1988-04-01',
      gender: 'Female',
      address: 'Mumbai',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Joint stiffness',
      treatmentGoal: 'Improve mobility',
      clinicalNotes: 'Suitable candidate for therapy'
    });

  caseId = caseRes.body.data._id;

  const planRes = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      target: 'Mobility restoration',
      objective: 'Reduce pain and improve range of motion',
      therapy: 'PRP + MSC',
      components: [
        { name: 'Platelet-rich plasma', type: 'injection', dose: '2 mL', schedule: 'Week 1' },
        { name: 'MSC therapy', type: 'infusion', dose: '1 session', schedule: 'Week 4' }
      ],
      timeline: [
        { phase: 'Assessment', startOffsetDays: 0, durationDays: 7, dependencies: [] },
        { phase: 'Intervention', startOffsetDays: 7, durationDays: 21, dependencies: ['Assessment'] }
      ],
      status: 'draft',
      version: 1,
      notes: 'Initial regenerative plan'
    });

  planId = planRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/plans/:id/decision-support returns eligibility, risk/benefit and rationale', async () => {
  const res = await request(app)
    .post(`/api/plans/${planId}/decision-support`)
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      planId,
      patientId,
      caseId,
      therapy: 'PRP + MSC'
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.data.eligible === 'boolean');
  assert.ok(Array.isArray(res.body.data.eligibilityChecks));
  assert.ok(Array.isArray(res.body.data.riskBenefit));
  assert.ok(Array.isArray(res.body.data.expectedOutcomes));
  assert.ok(typeof res.body.data.rationale === 'string');
});

test('POST /api/decision-support/override captures a clinician override and reason', async () => {
  const res = await request(app)
    .post('/api/decision-support/override')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      planId,
      patientId,
      caseId,
      overrideType: 'clinical_exception',
      reason: 'Patient-specific exception approved after chart review',
      notes: 'Continue under intensified monitoring'
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.overrideType, 'clinical_exception');
  assert.match(res.body.data.reason, /chart review/i);
});
