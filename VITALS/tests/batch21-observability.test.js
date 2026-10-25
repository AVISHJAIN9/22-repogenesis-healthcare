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

  const clinician = await createClinician('batch21doctor', 'default');
  clinicianToken = clinician.token;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('POST observability events and GET summary returns structured operational metrics', async () => {
  const usageRes = await request(app)
    .post('/api/observability/usage-events')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      route: '/api/patients',
      method: 'GET',
      statusCode: 200,
      durationMs: 145,
      actorRole: 'clinician'
    });

  assert.equal(usageRes.status, 201);
  assert.equal(usageRes.body.success, true);

  const errorRes = await request(app)
    .post('/api/observability/errors')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      route: '/api/alerts',
      message: 'Validation warning',
      severity: 'warning',
      fingerprint: 'validation-warning'
    });

  assert.equal(errorRes.status, 201);
  assert.equal(errorRes.body.success, true);

  const metricRes = await request(app)
    .post('/api/observability/metrics')
    .set('Authorization', `Bearer ${clinicianToken}`)
    .send({
      name: 'request_latency_ms',
      value: 321,
      unit: 'ms',
      group: 'api'
    });

  assert.equal(metricRes.status, 201);
  assert.equal(metricRes.body.success, true);

  const summaryRes = await request(app)
    .get('/api/observability/summary')
    .set('Authorization', `Bearer ${clinicianToken}`);

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.success, true);
  assert.ok(summaryRes.body.data.summary.totalUsageEvents >= 1);
  assert.ok(summaryRes.body.data.summary.totalErrorEvents >= 1);
  assert.ok(summaryRes.body.data.summary.totalMetrics >= 1);
});
