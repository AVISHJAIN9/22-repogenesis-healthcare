const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const { evaluateDecisionSupport, createOverride, getDecisionSupportSummary } = require('../services/decisionSupportService');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
}

router.use(requireAuth);

router.post('/evaluate', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('therapy').optional().trim(),
  body('planId').optional().isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await evaluateDecisionSupport({
      patientId: req.body.patientId,
      caseId: req.body.caseId,
      planId: req.body.planId || null,
      therapy: req.body.therapy,
      tenantId: req.user.tenantId || 'default',
      createdBy: req.user._id.toString()
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post('/override', requireRole('admin', 'clinician'), requirePermission('clinical:write'), [
  body('planId').optional().isMongoId(),
  body('patientId').optional().isMongoId(),
  body('caseId').optional().isMongoId(),
  body('overrideType').optional().isIn(['clinical_exception', 'risk_waiver', 'policy_exception', 'manual_review']),
  body('reason').trim().notEmpty().withMessage('reason is required'),
  body('notes').optional().trim(),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await createOverride({
      planId: req.body.planId || null,
      patientId: req.body.patientId || null,
      caseId: req.body.caseId || null,
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

router.get('/:planId', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), [
  param('planId').isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await getDecisionSupportSummary(req.params.planId, req.user.tenantId || 'default');
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
