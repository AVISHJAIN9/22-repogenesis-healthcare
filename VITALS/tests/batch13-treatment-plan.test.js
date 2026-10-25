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
let adminToken;
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

  const clinician = await createClinician('batch13doctor', 'default');
  adminToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Thirteen',
      email: 'batch13@example.com',
      phone: '9876543211',
      dateOfBirth: '1992-05-18',
      gender: 'Male',
      address: 'Pune',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Chronic joint pain',
      treatmentGoal: 'Improve mobility',
      clinicalNotes: 'Candidate for regenerative plan' 
    });

  caseId = caseRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/plans creates a valid treatment plan and list endpoint paginates it', async () => {
  const createRes = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      patientId,
      caseId,
      target: 'Joint regeneration',
      objective: 'Reduce pain and restore mobility',
      therapy: 'PRP + MSC',
      components: [
        { name: 'Platelet-rich plasma', type: 'injection', dose: '2 mL', schedule: 'Week 1' },
        { name: 'Mesenchymal stem cell therapy', type: 'infusion', dose: '1 session', schedule: 'Week 4' }
      ],
      timeline: [
        { phase: 'Assessment', startOffsetDays: 0, durationDays: 7, dependencies: [] },
        { phase: 'Intervention', startOffsetDays: 7, durationDays: 14, dependencies: ['Assessment'] }
      ],
      status: 'draft',
      version: 1,
      notes: 'Conservative regenerative approach'
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.equal(createRes.body.data.target, 'Joint regeneration');

  const listRes = await request(app)
    .get(`/api/plans?patientId=${patientId}&page=1&limit=20`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.success, true);
  assert.ok(listRes.body.data.docs.length >= 1);
});

test('POST /api/plans validates missing or invalid input', async () => {
  const res = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      patientId,
      caseId,
      objective: 'Need plan'
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(Array.isArray(res.body.errors));
});

test('POST /api/plans rejects unauthorized and cross-tenant access', async () => {
  const unauth = await request(app)
    .post('/api/plans')
    .send({
      patientId,
      caseId,
      target: 'Should fail',
      objective: 'No auth',
      therapy: 'Manual',
      components:[],
      timeline:[],
      status: 'draft',
      version: 1
    });

  assert.equal(unauth.status, 401);

  const otherTenantClinician = await createClinician('batch13other', 'tenant-b');
  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${otherTenantClinician.token}`)
    .send({
      firstName: 'Cross',
      lastName: 'Tenant',
      email: 'cross@example.com',
      phone: '9876543212',
      dateOfBirth: '1990-08-01',
      gender: 'Female',
      address: 'Berlin',
      consentForTreatment: true
    });

  const crossTenantRes = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${otherTenantClinician.token}`)
    .send({
      patientId,
      caseId,
      target: 'Unauthorized plan',
      objective: 'Cross-tenant error',
      therapy: 'Manual',
      components: [],
      timeline: [],
      status: 'draft',
      version: 1
    });

  assert.equal(crossTenantRes.status, 403);
  assert.equal(crossTenantRes.body.success, false);
});

test('POST /api/plans/compare returns a diff between two plan versions', async () => {
  const planA = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      patientId,
      caseId,
      target: 'Joint regeneration',
      objective: 'Pain reduction',
      therapy: 'Cell therapy',
      components: [{ name: 'Session 1', type: 'injection', dose: '1 ml', schedule: 'Week 1' }],
      timeline: [{ phase: 'Baseline', startOffsetDays: 0, durationDays: 7, dependencies: [] }],
      status: 'draft',
      version: 1,
      notes: 'Original plan'
    });

  const planB = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      patientId,
      caseId,
      target: 'Joint regeneration',
      objective: 'Pain reduction and mobility improvement',
      therapy: 'Cell therapy + rehab',
      components: [
        { name: 'Session 1', type: 'injection', dose: '1 ml', schedule: 'Week 1' },
        { name: 'Rehab', type: 'rehab', dose: '30 min', schedule: 'Week 2' }
      ],
      timeline: [
        { phase: 'Baseline', startOffsetDays: 0, durationDays: 7, dependencies: [] },
        { phase: 'Therapy', startOffsetDays: 7, durationDays: 21, dependencies: ['Baseline'] }
      ],
      status: 'under_review',
      version: 2,
      notes: 'Updated plan'
    });

  const compareRes = await request(app)
    .post('/api/plans/compare')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ planAId: planA.body.data._id, planBId: planB.body.data._id });

  assert.equal(compareRes.status, 200);
  assert.equal(compareRes.body.success, true);
  assert.ok(compareRes.body.data.diff.length > 0);
});
