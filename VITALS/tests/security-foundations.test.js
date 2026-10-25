process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isPasswordValid, hasPermission, canAccessPatientRecord, canAccessCaseRecord } = require('../services/securityService');

test('password policy accepts strong passwords and rejects weak ones', () => {
  assert.equal(isPasswordValid('Secret123'), true);
  assert.equal(isPasswordValid('short'), false);
  assert.equal(isPasswordValid('onlylowercase'), false);
});

test('patient accounts can read their own record and case access', async () => {
  const patientUser = {
    role: 'patient',
    patientId: '507f1f77bcf86cd799439011',
    permissions: []
  };

  assert.equal(await hasPermission(patientUser, 'patient:read'), true);
  assert.equal(canAccessPatientRecord(patientUser, '507f1f77bcf86cd799439011'), true);
  assert.equal(canAccessPatientRecord(patientUser, '507f1f77bcf86cd799439012'), false);
  assert.equal(canAccessCaseRecord(patientUser, '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439011'), true);
  assert.equal(canAccessCaseRecord(patientUser, '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439012'), false);
});

test('clinician assigned access is respected', () => {
  const clinician = {
    role: 'clinician',
    assignedPatientIds: ['507f1f77bcf86cd799439011'],
    assignedCaseIds: ['507f1f77bcf86cd799439021'],
    permissions: []
  };

  assert.equal(canAccessPatientRecord(clinician, '507f1f77bcf86cd799439011'), true);
  assert.equal(canAccessPatientRecord(clinician, '507f1f77bcf86cd799439012'), false);
  assert.equal(canAccessCaseRecord(clinician, '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439011'), true);
});
