const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const {
  createProgressScore,
  createAlert,
  acknowledgeAlert,
  getPatientAlertSummary,
  getPatientTrendSummary
} = require('../services/alertingService');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
}

router.use(requireAuth);

router.post('/progress-score', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('score').isFloat({ min: 0, max: 100 }).withMessage('score must be between 0 and 100'),
  body('baselineScore').optional().isFloat({ min: 0, max: 100 }).withMessage('baselineScore must be between 0 and 100'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('windowLabel').optional().trim(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createProgressScore({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('type').optional().isIn(['follow_up', 'milestone', 'trend', 'safety']),
  body('severity').optional().isIn(['info', 'warning', 'critical']),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('message').trim().notEmpty().withMessage('message is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createAlert({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:alertId/acknowledge', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  param('alertId').isMongoId().withMessage('alertId is required'),
  body('acknowledgedBy').optional().trim(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await acknowledgeAlert(req.params.alertId, req.body.acknowledgedBy, req.user._id.toString());
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/patient/:patientId/summary', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  param('patientId').isMongoId().withMessage('patientId is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await getPatientAlertSummary(req.params.patientId, null, req.user._id.toString());
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get('/patient/:patientId/trends', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  param('patientId').isMongoId().withMessage('patientId is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await getPatientTrendSummary(req.params.patientId, null);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
