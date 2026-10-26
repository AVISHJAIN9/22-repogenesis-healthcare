const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const {
  createMonitoringPlan,
  createFollowUp,
  createSafetyWarning,
  createMilestone,
  createQuestionnaire,
  submitQuestionnaireResponse,
  getMonitoringSummary
} = require('../services/monitoringService');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
}

router.use(requireAuth);

router.post('/plans', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('planName').trim().notEmpty().withMessage('planName is required'),
  body('status').optional().isIn(['draft', 'active', 'paused', 'completed']),
  body('followUpIntervalDays').optional().isInt({ min: 1 }),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createMonitoringPlan({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/follow-ups', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('monitoringPlanId').optional().isMongoId(),
  body('scheduledFor').optional().isISO8601().withMessage('scheduledFor must be an ISO8601 date'),
  body('type').optional().isIn(['check-in', 'assessment', 'review', 'recovery']),
  body('status').optional().isIn(['scheduled', 'completed', 'overdue', 'canceled']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createFollowUp({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/safety-warnings', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('severity').optional().isIn(['info', 'warning', 'critical']),
  body('status').optional().isIn(['active', 'acknowledged', 'resolved']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createSafetyWarning({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/milestones', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'missed']),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be an ISO8601 date'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createMilestone({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/questionnaires', requireRole('admin', 'clinician'), requirePermission('clinical:write'), [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('questions').optional().isArray(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createQuestionnaire({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/questionnaire-responses', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  body('questionnaireId').isMongoId().withMessage('questionnaireId is required'),
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('responses').optional().isObject(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await submitQuestionnaireResponse({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/patient/:patientId/summary', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await getMonitoringSummary(req.params.patientId, req.query.caseId || null, req.user._id.toString());
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
