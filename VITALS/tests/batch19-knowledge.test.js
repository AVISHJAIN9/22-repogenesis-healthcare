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
    permissions: ['patient:read', 'patient:write', 'clinical:read', 'clinical:write', 'case:read']
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

  const clinician = await createClinician('batch19doctor', 'default');
  clinicianToken = clinician.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      firstName: 'Batch',
      lastName: 'Nineteen',
      email: 'batch19@example.com',
      phone: '9876543219',
      dateOfBirth: '1988-04-12',
      gender: 'Female',
      address: 'Pune',
      consentForTreatment: true
    });

  patientId = patientRes.body.data._id;

  const caseRes = await request(app)
    .post('/api/cases')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseType: 'regenerative',
      chiefComplaint: 'Knee pain',
      treatmentGoal: 'Improve mobility',
      clinicalNotes: 'Knowledge base check'
    });

  caseId = caseRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/knowledge/entries, search, and summary endpoints return indexed knowledge content', async () => {
  const createRes = await request(app)
    .post('/api/knowledge/entries')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      patientId,
      caseId,
      title: 'Osteoarthritis knee guidance',
      category: 'guideline',
      source: 'AAOS',
      excerpt: 'Use nonoperative care first and reassess mobility every four weeks.',
      tags: ['osteoarthritis', 'knee', 'mobility'],
      status: 'active'
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.equal(createRes.body.data.title, 'Osteoarthritis knee guidance');

  const searchRes = await request(app)
    .get('/api/knowledge/search?query=osteoarthritis')
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(searchRes.status, 200);
  assert.equal(searchRes.body.success, true);
  assert.ok(Array.isArray(searchRes.body.data.results));
  assert.ok(searchRes.body.data.results.length >= 1);

  const summaryRes = await request(app)
    .get(`/api/knowledge/patient/${patientId}/summary`)
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.success, true);
  assert.ok(summaryRes.body.data.summary.totalKnowledgeEntries >= 1);
});
