const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const {
  createTreatmentPlan,
  findPlans,
  getPlanById,
  updatePlanStatus,
  listProtocolRecommendations,
  comparePlans,
  buildPlanFromSelection
} = require('../services/planService');
const { evaluateDecisionSupport, createOverride } = require('../services/decisionSupportService');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
}

router.use(requireAuth);

router.get('/', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('patientId').optional().isMongoId(),
  query('caseId').optional().isMongoId(),
  query('status').optional().isIn(['draft', 'under_review', 'approved', 'rejected']),
  validateRequest
], async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.caseId) filter.caseId = req.query.caseId;
    if (req.query.status) filter.status = req.query.status;
    if (req.user.role === 'patient' && req.user.patientId) {
      filter.patientId = req.user.patientId;
    }

    const result = await findPlans(filter, { page: req.query.page || 1, limit: req.query.limit || 20 });
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('target').trim().notEmpty().withMessage('target is required'),
  body('objective').trim().notEmpty().withMessage('objective is required'),
  body('therapy').trim().notEmpty().withMessage('therapy is required'),
  body('status').optional().isIn(['draft', 'under_review', 'approved', 'rejected']),
  body('components').optional().isArray(),
  body('timeline').optional().isArray(),
  body('version').optional().isInt({ min: 1 }),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createTreatmentPlan({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/build', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('target').optional().trim(),
  body('objective').optional().trim(),
  body('therapy').optional().trim(),
  body('components').optional().isArray(),
  body('timeline').optional().isArray(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await buildPlanFromSelection({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getPlanById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Treatment plan not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', requireRole('admin', 'clinician'), requirePermission('clinical:write'), [
  param('id').isMongoId(),
  body('status').isIn(['draft', 'under_review', 'approved', 'rejected']).withMessage('status must be draft, under_review, approved, or rejected'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updatePlanStatus(req.params.id, req.body.status, req.user._id.toString(), req.user.tenantId || 'default');
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/recommendations', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  body('patientId').optional().isMongoId(),
  body('caseId').optional().isMongoId(),
  body('therapy').optional().trim(),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await listProtocolRecommendations({
      patientId: req.body.patientId,
      caseId: req.body.caseId,
      therapy: req.body.therapy,
      tenantId: req.user.tenantId || 'default'
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post('/compare', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  body('planAId').isMongoId().withMessage('planAId required'),
  body('planBId').isMongoId().withMessage('planBId required'),
  validateRequest
], async (req, res, next) => {
  try {
    const diff = await comparePlans(req.body.planAId, req.body.planBId, req.user.tenantId || 'default');
    return res.json({ success: true, data: diff });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/decision-support', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  param('id').isMongoId(),
  body('patientId').optional().isMongoId(),
  body('caseId').optional().isMongoId(),
  body('therapy').optional().trim(),
  validateRequest
], async (req, res, next) => {
  try {
    const plan = await getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'Treatment plan not found' });

    const data = await evaluateDecisionSupport({
      patientId: req.body.patientId || plan.patientId,
      caseId: req.body.caseId || plan.caseId,
      planId: plan._id,
      therapy: req.body.therapy || plan.therapy,
      tenantId: req.user.tenantId || 'default',
      createdBy: req.user._id.toString()
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/override', requireRole('admin', 'clinician'), requirePermission('clinical:write'), [
  param('id').isMongoId(),
  body('overrideType').optional().isIn(['clinical_exception', 'risk_waiver', 'policy_exception', 'manual_review']),
  body('reason').trim().notEmpty().withMessage('reason is required'),
  body('notes').optional().trim(),
  validateRequest
], async (req, res, next) => {
  try {
    const plan = await getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'Treatment plan not found' });

    const data = await createOverride({
      planId: plan._id,
      patientId: plan.patientId,
      caseId: plan.caseId,
      clinicianId: req.user._id,
      overrideType: req.body.overrideType || 'clinical_exception',
      reason: req.body.reason,
      notes: req.body.notes,
      tenantId: req.user.tenantId || 'default'
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
