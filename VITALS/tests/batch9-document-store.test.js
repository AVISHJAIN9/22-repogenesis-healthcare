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

async function createDoctor(username, tenantId = 'default') {
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

  const doctor = await createDoctor('batch9doctor', 'default');
  token = doctor.token;

  const patientRes = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      firstName: 'Batch',
      lastName: 'Nine',
      email: 'batch9@example.com',
      phone: '9876543210',
      dateOfBirth: '1991-04-12',
      gender: 'Male',
      address: 'Bengaluru'
    });

  patientId = patientRes.body.data._id;
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('GET /api/health/db reports connected database state', async () => {
  const res = await request(app).get('/api/health/db');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'connected');
});

test('POST /api/documents creates a document and list endpoint returns paginated results', async () => {
  const createRes = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({
      ownerEntity: 'patient',
      ownerId: patientId,
      documentType: 'report',
      originalFileName: 'lab-report.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      storageKey: 'patients/default/report.pdf',
      checksum: 'abc123',
      version: 1
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);

  const listRes = await request(app)
    .get('/api/documents?page=1&limit=20')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.success, true);
  assert.equal(listRes.body.data.docs.length > 0, true);
});

test('POST /api/documents rejects invalid size and missing auth', async () => {
  const unauth = await request(app)
    .post('/api/documents')
    .send({
      ownerEntity: 'patient',
      ownerId: patientId,
      originalFileName: 'bad.pdf',
      mimeType: 'application/pdf',
      fileSize: 1,
      storageKey: 'patients/default/bad.pdf'
    });

  assert.equal(unauth.status, 401);

  const invalid = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({
      ownerEntity: 'patient',
      ownerId: patientId,
      originalFileName: 'bad.pdf',
      mimeType: 'application/pdf',
      fileSize: 999999999999999,
      storageKey: 'patients/default/bad.pdf'
    });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.success, false);
});

test('POST /api/documents/imaging creates the imaging metadata store with rule-based quality reporting', async () => {
  const res = await request(app)
    .post('/api/documents/imaging')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      modality: 'MRI',
      studyType: 'knee-regeneration',
      storageKey: 'patients/default/mri.dcm',
      width: 2048,
      height: 1536,
      fileSizeBytes: 2500000,
      missingMetadata: ['studyDescription'],
      blurMetric: 80
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(['pass', 'warn', 'fail'].includes(res.body.data.qualityStatus));
});

test('Cross-tenant view is isolated', async () => {
  const otherDoctor = await createDoctor('otherdoctor', 'tenant-b');

  await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${otherDoctor.token}`)
    .send({
      ownerEntity: 'patient',
      ownerId: patientId,
      documentType: 'report',
      originalFileName: 'other-tenant.pdf',
      mimeType: 'application/pdf',
      fileSize: 500,
      storageKey: 'patients/tenant-b/other-tenant.pdf',
      checksum: 'other-tenant',
      version: 1,
      tenantId: 'tenant-b'
    });

  const listRes = await request(app)
    .get('/api/documents?page=1&limit=20')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.data.docs.every((doc) => doc.tenantId === 'default'));
});
