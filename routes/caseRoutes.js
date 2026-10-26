const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission, requireCaseScope } = require('../middleware/auth');
const { createCase, findCases, getCaseById, updateCaseStatus } = require('../services/caseService');
const { getCaseOverview } = require('../services/dashboardService');
const { canAccessCaseRecord } = require('../services/securityService');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(err => ({ field: err.path, msg: err.msg })) });
  }
  return next();
};

router.use(requireAuth);

router.get('/', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('case:read'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['new', 'intake', 'under_review', 'accepted', 'in_treatment', 'monitoring', 'completed', 'closed']),
  validateRequest
], async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.user.role === 'patient' && req.user.patientId) {
      filter.patientId = req.user.patientId;
    }

    const result = await findCases(filter, { page: req.query.page || 1, limit: req.query.limit || 20 });
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireRole('admin', 'clinician', 'nurse'), requirePermission('case:write'), [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('chiefComplaint').trim().notEmpty().withMessage('Chief complaint is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createCase({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('case:read'), requireCaseScope(), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getCaseById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Case not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/overview', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('case:read'), [
  param('id').isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const caseRecord = await getCaseById(req.params.id);
    if (!caseRecord) return res.status(404).json({ success: false, error: 'Case not found' });
    if (req.user.role !== 'admin' && !canAccessCaseRecord(req.user, req.params.id, caseRecord.patientId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: access denied for case overview' });
    }
    const data = await getCaseOverview(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', requireRole('admin', 'clinician'), requirePermission('case:write'), requireCaseScope(), [
  param('id').isMongoId(),
  body('status').isIn(['new', 'intake', 'under_review', 'accepted', 'in_treatment', 'monitoring', 'completed', 'closed']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateCaseStatus(req.params.id, req.body.status, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Case not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
