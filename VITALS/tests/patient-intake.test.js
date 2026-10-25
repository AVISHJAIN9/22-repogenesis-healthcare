process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { app } = require('../app');
const request = require('supertest');
const User = require('../models/User');
const bcrypt = require('bcrypt');

let mongoServer;
let token;
let patientId;
let caseId;

async function createToken() {
  const user = await User.create({
    username: 'testdoctor',
    password: await bcrypt.hash('secret123', 10),
    name: 'Test Doctor',
    role: 'clinician',
    tenantId: 'default'
  });

  const { body } = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testdoctor', password: 'secret123' });

  token = body.token;
  return user;
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
  await createToken();
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/patients creates a patient', async () => {
  const res = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav@example.com',
      phone: '9191919191',
      dateOfBirth: '1985-06-12',
      gender: 'Male',
      address: 'MG Road, Pune',
      emergencyContactName: 'Neha Sharma',
      emergencyContactPhone: '9898989898'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  patientId = res.body.data._id;
});

test('GET /api/patients returns paginated list', async () => {
  const res = await request(app)
    .get('/api/patients?page=1&limit=20')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.docs.length >= 1, true);
});

test('POST /api/patients rejects missing phone', async () => {
  const res = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${token}`)
    .send({ firstName: 'No', lastName: 'Phone' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('POST /api/cases creates a case for a patient', async () => {
  const res = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseType: 'Regenerative Medicine',
      chiefComplaint: 'Chronic joint pain',
      status: 'new'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  caseId = res.body.data._id;
});

test('PATCH /api/cases/:id/status updates case status', async () => {
  const res = await request(app)
    .patch(`/api/cases/${caseId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'accepted' });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'accepted');
});

test('POST /api/clinical/medical-history stores history', async () => {
  const res = await request(app)
    .post('/api/clinical/medical-history')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      pastMedicalHistory: ['Hypertension'],
      allergies: ['Penicillin'],
      currentMedications: ['Vitamin D'],
      comorbidities: ['Obesity']
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
});

test('POST /api/clinical/diagnoses creates diagnosis', async () => {
  const res = await request(app)
    .post('/api/clinical/diagnoses')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      caseId,
      diagnosisName: 'Osteoarthritis',
      diagnosisCode: 'M17',
      severity: 'moderate',
      notes: 'Joint pain increased over 3 months'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
});

test('Unauthorized access to patient list fails', async () => {
  const res = await request(app)
    .get('/api/patients');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});
