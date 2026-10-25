const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth, requireRole, requirePermission, requirePatientScope } = require('../middleware/auth');
const { upsertMedicalHistory, getMedicalHistory, addDiagnosis, getDiagnoses, updateDiagnosis } = require('../services/clinicalService');

const router = express.Router();
router.use(requireAuth);

router.post('/medical-history', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), requirePatientScope(), [
  body('patientId').isMongoId().withMessage('patientId required'),
  body('caseId').optional().isMongoId(),
  body('pastMedicalHistory').optional().isArray()
], async (req, res, next) => {
  try {
    const item = await upsertMedicalHistory({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/medical-history/:patientId', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), requirePatientScope(), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId()
], async (req, res, next) => {
  try {
    const items = await getMedicalHistory(req.params.patientId, req.query.caseId || null);
    return res.json({ success: true, data: items });
  } catch (error) {
    return next(error);
  }
});

router.post('/diagnoses', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), requirePatientScope(), [
  body('patientId').isMongoId().withMessage('patientId required'),
  body('caseId').isMongoId().withMessage('caseId required'),
  body('diagnosisName').trim().notEmpty().withMessage('Diagnosis name required')
], async (req, res, next) => {
  try {
    const item = await addDiagnosis({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/diagnoses/:caseId', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), requirePatientScope(), [
  param('caseId').isMongoId(),
  query('patientId').isMongoId().withMessage('patientId required')
], async (req, res, next) => {
  try {
    const items = await getDiagnoses(req.params.caseId, req.query.patientId);
    return res.json({ success: true, data: items });
  } catch (error) {
    return next(error);
  }
});

router.patch('/diagnoses/:id', requireRole('admin', 'clinician'), requirePermission('clinical:write'), requirePatientScope(), [
  param('id').isMongoId(),
  body('diagnosisName').optional().trim().notEmpty().withMessage('Diagnosis name cannot be empty')
], async (req, res, next) => {
  try {
    const item = await updateDiagnosis(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Diagnosis not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
