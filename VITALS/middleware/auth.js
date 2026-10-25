const User = require('../models/User');
const { verifyAccessToken, hasPermission, canAccessPatientRecord, canAccessCaseRecord } = require('../services/securityService');

function getToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '').trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ success: false, error: 'Account temporarily locked due to repeated failed login attempts' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (roles.includes(req.user.role) || req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
  };
}

function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const allowed = await hasPermission(req.user, permission);
    if (!allowed) return res.status(403).json({ success: false, error: 'Forbidden: permission denied' });
    return next();
  };
}

function requirePatientScope() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
    if (!patientId) return next();
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'patient') {
      return canAccessPatientRecord(req.user, patientId)
        ? next()
        : res.status(403).json({ success: false, error: 'Forbidden: patient can only access their own record' });
    }
    if (req.user.role === 'clinician' || req.user.role === 'nurse') {
      return canAccessPatientRecord(req.user, patientId)
        ? next()
        : res.status(403).json({ success: false, error: 'Forbidden: clinician access is restricted to assigned patients' });
    }
    return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
  };
}

function requireCaseScope() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const caseId = req.params.id || req.params.caseId || req.body.caseId || req.query.caseId;
    if (!caseId) return next();
    const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'patient') {
      return canAccessCaseRecord(req.user, caseId, patientId)
        ? next()
        : res.status(403).json({ success: false, error: 'Forbidden: patient can only access their own cases' });
    }
    if (req.user.role === 'clinician' || req.user.role === 'nurse') {
      return canAccessCaseRecord(req.user, caseId, patientId)
        ? next()
        : res.status(403).json({ success: false, error: 'Forbidden: clinician access is restricted to assigned cases' });
    }
    return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
  };
}

module.exports = { requireAuth, requireRole, requirePermission, requirePatientScope, requireCaseScope, getToken };
