const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const DEFAULT_PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const ROLE_PERMISSIONS = {
  admin: ['patient:read', 'patient:write', 'case:read', 'case:write', 'clinical:read', 'clinical:write', 'audit:read', 'user:read', 'user:write', 'role:read', 'role:write'],
  clinician: ['patient:read', 'patient:write', 'case:read', 'case:write', 'clinical:read', 'clinical:write', 'audit:read'],
  nurse: ['patient:read', 'case:read', 'clinical:read', 'clinical:write'],
  researcher: ['patient:read', 'case:read', 'clinical:read', 'audit:read'],
  patient: ['patient:read', 'patient:read:self', 'case:read', 'case:read:self', 'clinical:read', 'clinical:read:self']
};

function getAccessTokenSecret() {
  return process.env.JWT_SECRET || 'dev-secret-key';
}

function getRefreshTokenSecret() {
  return process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'dev-secret-key'}-refresh`;
}

function isPasswordValid(password) {
  return typeof password === 'string' && DEFAULT_PASSWORD_POLICY.test(password);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function validatePassword(password, userPassword) {
  return bcrypt.compare(password, userPassword);
}

function signAccessToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role, tenantId: user.tenantId || 'default' }, getAccessTokenSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role, tenantId: user.tenantId || 'default', type: 'refresh' }, getRefreshTokenSecret(), { expiresIn: REFRESH_TOKEN_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getAccessTokenSecret());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshTokenSecret());
}

async function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

async function setUserPermissions(user) {
  if (!user) return [];
  const merged = new Set([...(user.permissions || []), ...(ROLE_PERMISSIONS[user.role] || [])]);
  user.permissions = Array.from(merged);
  return user.permissions;
}

async function hasPermission(user, permission) {
  if (!user) return false;
  await setUserPermissions(user);
  return (user.permissions || []).includes(permission) || (user.role === 'admin');
}

function normalizeObjectId(value) {
  if (!value) return null;
  return String(value);
}

function canAccessPatientRecord(user, patientId) {
  if (!user || !patientId) return false;
  if (user.role === 'admin') return true;
  const target = normalizeObjectId(patientId);
  const selfPatient = normalizeObjectId(user.patientId);
  if (user.role === 'patient') return selfPatient && selfPatient === target;
  if (user.role === 'clinician' || user.role === 'nurse') {
    const assigned = (user.assignedPatientIds || []).map((id) => normalizeObjectId(id));
    if (!assigned.length) return true;
    return assigned.includes(target);
  }
  return false;
}

function canAccessCaseRecord(user, caseId, patientId = null) {
  if (!user || !caseId) return false;
  if (user.role === 'admin') return true;
  const target = normalizeObjectId(caseId);
  const selfPatient = normalizeObjectId(user.patientId);
  if (user.role === 'patient') {
    if (patientId) return selfPatient && selfPatient === normalizeObjectId(patientId);
    return false;
  }
  if (user.role === 'clinician' || user.role === 'nurse') {
    const assignedCaseIds = (user.assignedCaseIds || []).map((id) => normalizeObjectId(id));
    if (!assignedCaseIds.length && !user.assignedPatientIds?.length) return true;
    if (assignedCaseIds.includes(target)) return true;
    if (patientId) {
      const assignedPatients = (user.assignedPatientIds || []).map((id) => normalizeObjectId(id));
      return assignedPatients.includes(normalizeObjectId(patientId));
    }
  }
  return false;
}

async function applyLoginLockout(user) {
  if (!user) return false;
  const lockoutWindow = 15 * 60 * 1000;
  const failedAttempts = Number(user.failedLoginAttempts || 0);
  const maxAttempts = 5;
  const now = new Date();
  if (user.lockedUntil && new Date(user.lockedUntil) > now) {
    return true;
  }
  if (failedAttempts >= maxAttempts) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = new Date(Date.now() + lockoutWindow);
    await user.save();
    return true;
  }
  return false;
}

async function resetLoginAttempts(user) {
  if (!user) return;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
}

async function registerFailedLogin(user) {
  if (!user) return;
  user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= 5) {
    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await user.save();
}

module.exports = {
  ROLE_PERMISSIONS,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  isPasswordValid,
  hashPassword,
  validatePassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRolePermissions,
  setUserPermissions,
  hasPermission,
  canAccessPatientRecord,
  canAccessCaseRecord,
  applyLoginLockout,
  resetLoginAttempts,
  registerFailedLogin,
  getAccessTokenSecret,
  getRefreshTokenSecret
};
