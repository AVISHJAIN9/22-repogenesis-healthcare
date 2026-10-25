const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const {
  createPatientReportedOutcome,
  createClinicalOutcome,
  createImagingFollowUp,
  createBiomarkerFollowUp,
  createAdverseEvent,
  getPatientOutcomeSummary
} = require('../services/outcomeCaptureService');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
}

router.use(requireAuth);

router.post('/pros', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('instrument').trim().notEmpty().withMessage('instrument is required'),
  body('score').optional().isFloat({ min: 0, max: 100 }),
  body('completionDate').optional().isISO8601().withMessage('completionDate must be an ISO8601 date'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createPatientReportedOutcome({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/clinical', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('outcomeType').trim().notEmpty().withMessage('outcomeType is required'),
  body('value').optional().isFloat(),
  body('assessedAt').optional().isISO8601().withMessage('assessedAt must be an ISO8601 date'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createClinicalOutcome({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/imaging-follow-ups', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('studyType').trim().notEmpty().withMessage('studyType is required'),
  body('studyDate').optional().isISO8601().withMessage('studyDate must be an ISO8601 date'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createImagingFollowUp({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/biomarker-follow-ups', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('markerName').trim().notEmpty().withMessage('markerName is required'),
  body('measuredAt').optional().isISO8601().withMessage('measuredAt must be an ISO8601 date'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createBiomarkerFollowUp({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.post('/adverse-events', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').isMongoId().withMessage('caseId is required'),
  body('eventType').trim().notEmpty().withMessage('eventType is required'),
  body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('detectedAt').optional().isISO8601().withMessage('detectedAt must be an ISO8601 date'),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createAdverseEvent({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
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
    const data = await getPatientOutcomeSummary(req.params.patientId, req.query.caseId || null, req.user._id.toString());
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
