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

  const clinician = await createClinician('batch20doctor', 'default');
  clinicianToken = clinician.token;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST /api/analytics/protocols and evidence endpoints plus summary', async () => {
  const protocolRes = await request(app)
    .post('/api/analytics/protocols')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      name: 'Knee recovery protocol',
      category: 'rehabilitation',
      version: 'v1.0',
      status: 'active',
      summary: 'Incremental loading with reassessment every four weeks.'
    });

  assert.equal(protocolRes.status, 201);
  assert.equal(protocolRes.body.success, true);
  assert.equal(protocolRes.body.data.name, 'Knee recovery protocol');

  const evidenceRes = await request(app)
    .post('/api/analytics/evidence')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      protocolId: protocolRes.body.data._id,
      title: 'Post-op mobility trial',
      citation: 'Clinical Recovery Journal 2025; 42(3): 118-130',
      sourceType: 'journal',
      summary: 'Mobility improved after structured progression.'
    });

  assert.equal(evidenceRes.status, 201);
  assert.equal(evidenceRes.body.success, true);
  assert.equal(evidenceRes.body.data.title, 'Post-op mobility trial');

  const summaryRes = await request(app)
    .get('/api/analytics/summary')
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.success, true);
  assert.ok(summaryRes.body.data.summary.totalProtocols >= 1);
  assert.ok(summaryRes.body.data.summary.totalEvidenceLinks >= 1);
});
