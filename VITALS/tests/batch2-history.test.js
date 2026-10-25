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
let token;
let patientId;
let caseId;

async function createPatientAndCase() {
  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      firstName: 'Priya',
      lastName: 'Nair',
      email: 'priya@example.com',
      phone: '9123456780',
      dateOfBirth: '1990-02-10',
      gender: 'Female',
      address: 'Koramangala, Bengaluru'
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseType: 'Primary Care',
      chiefComplaint: 'Persistent fatigue',
      status: 'new'
    });

  caseId = caseRes.body.data._id;
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);

  const user = await User.create({
    username: 'batch2doctor',
    password: await bcrypt.hash('secret123', 10),
    name: 'Batch 2 Doctor',
    role: 'clinician',
    tenantId: 'default'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: user.username, password: 'secret123' });

  token = loginRes.body.token;
  await createPatientAndCase();
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/history/symptoms creates a symptom record', async () => {
  const res = await request(app)
    .post('/api/history/symptoms')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      name: 'Chest pain',
      onsetDate: '2026-09-01',
      severity: 'moderate',
      notes: 'Worsens on exertion'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.name, 'Chest pain');
});

test('POST /api/history/treatments creates treatment history', async () => {
  const res = await request(app)
    .post('/api/history/treatments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      treatmentType: 'Physiotherapy',
      priorTreatment: 'Manual therapy',
      outcome: 'Improved mobility',
      startDate: '2026-08-01',
      endDate: '2026-08-20',
      status: 'completed'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
});

test('POST /api/history/medications creates medication history', async () => {
  const res = await request(app)
    .post('/api/history/medications')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      drugName: 'Aspirin',
      dose: '75 mg',
      frequency: 'once daily',
      route: 'oral',
      status: 'active',
      startDate: '2026-09-10'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.drugName, 'Aspirin');
});

test('POST /api/history/allergies and /api/history/comorbidities creates entries', async () => {
  const allergyRes = await request(app)
    .post('/api/history/allergies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      allergen: 'Penicillin',
      reaction: 'Rash',
      severity: 'moderate',
      status: 'active'
    });

  const comorbidityRes = await request(app)
    .post('/api/history/comorbidities')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      conditionName: 'Hypertension',
      status: 'active'
    });

  assert.equal(allergyRes.status, 201);
  assert.equal(comorbidityRes.status, 201);
  assert.equal(allergyRes.body.success, true);
  assert.equal(comorbidityRes.body.success, true);
});

test('GET /api/history/patient/:patientId/summary returns all datasets', async () => {
  const res = await request(app)
    .get(`/api/history/patient/${patientId}/summary`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.symptoms));
  assert.ok(Array.isArray(res.body.data.treatments));
  assert.ok(Array.isArray(res.body.data.medications));
  assert.ok(Array.isArray(res.body.data.allergies));
  assert.ok(Array.isArray(res.body.data.comorbidities));
});

test('POST /api/history/symptoms validates enum values and date consistency', async () => {
  const res = await request(app)
    .post('/api/history/symptoms')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      name: 'Shortness of breath',
      onsetDate: '2026-10-02',
      endDate: '2026-10-01',
      severity: 'extreme'
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('Missing auth fails on patient summary endpoint', async () => {
  const res = await request(app)
    .get(`/api/history/patient/${patientId}/summary`);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});
