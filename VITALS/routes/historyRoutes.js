const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createSymptom,
  listSymptoms,
  getSymptomById,
  updateSymptom,
  deleteSymptom,
  createTreatmentHistory,
  listTreatmentHistory,
  getTreatmentHistoryById,
  updateTreatmentHistory,
  deleteTreatmentHistory,
  createMedication,
  listMedications,
  getMedicationById,
  updateMedication,
  deleteMedication,
  createAllergy,
  listAllergies,
  getAllergyById,
  updateAllergy,
  deleteAllergy,
  createComorbidity,
  listComorbidities,
  getComorbidityById,
  updateComorbidity,
  deleteComorbidity,
  getPatientHistorySummary
} = require('../services/historyService');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
};

const validatePatientAndCase = [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('caseId').optional({ values: 'falsy' }).isMongoId().withMessage('caseId must be valid when provided')
];

router.use(requireAuth);

function buildListHandler(serviceList, modelName) {
  return async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await serviceList(req.params.patientId, req.query.caseId || null, { page, limit });
      return res.json({ success: true, data: result, model: modelName });
    } catch (error) {
      return next(error);
    }
  };
}

router.get('/patient/:patientId/summary', requireRole('admin', 'clinician', 'nurse'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const summary = await getPatientHistorySummary(req.params.patientId, req.query.caseId || null, req.user._id.toString());
    return res.json({ success: true, data: summary });
  } catch (error) {
    return next(error);
  }
});

router.post('/symptoms', requireRole('admin', 'clinician', 'nurse'), [
  ...validatePatientAndCase,
  body('name').trim().notEmpty().withMessage('Symptom name is required'),
  body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
  body('status').optional().isIn(['active', 'improving', 'resolved', 'chronic']),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('startDate must be a valid ISO date'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('endDate must be a valid ISO date'),
  body('onsetDate').optional({ nullable: true }).isISO8601().withMessage('onsetDate must be a valid ISO date'),
  validateRequest
], async (req, res, next) => {
  try {
    if (req.body.startDate || req.body.endDate || req.body.onsetDate) {
      const start = req.body.startDate || req.body.onsetDate;
      const end = req.body.endDate;
      if (start && end && new Date(end) < new Date(start)) {
        return res.status(400).json({ success: false, error: 'Symptom dates are inconsistent: end date cannot be earlier than the start date.' });
      }
    }
    const item = await createSymptom({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/symptoms/:patientId', requireRole('admin', 'clinician', 'nurse'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], buildListHandler(listSymptoms, 'symptom'));

router.get('/symptoms/by-id/:id', requireRole('admin', 'clinician', 'nurse'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getSymptomById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Symptom not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.patch('/symptoms/:id', requireRole('admin', 'clinician'), [
  param('id').isMongoId(),
  body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
  body('status').optional().isIn(['active', 'improving', 'resolved', 'chronic']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateSymptom(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Symptom not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.delete('/symptoms/:id', requireRole('admin', 'clinician'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await deleteSymptom(req.params.id, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Symptom not found' });
    return res.json({ success: true, data: { id: item._id, deleted: true } });
  } catch (error) { return next(error); }
});

router.post('/treatments', requireRole('admin', 'clinician', 'nurse'), [
  ...validatePatientAndCase,
  body('treatmentType').trim().notEmpty().withMessage('Treatment type is required'),
  body('status').optional().isIn(['planned', 'ongoing', 'completed', 'discontinued']),
  body('startDate').optional({ nullable: true }).isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  validateRequest
], async (req, res, next) => {
  try {
    if (req.body.startDate && req.body.endDate && new Date(req.body.endDate) < new Date(req.body.startDate)) {
      return res.status(400).json({ success: false, error: 'Treatment dates are inconsistent: end date cannot be earlier than the start date.' });
    }
    const item = await createTreatmentHistory({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.get('/treatments/:patientId', requireRole('admin', 'clinician', 'nurse'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], buildListHandler(listTreatmentHistory, 'treatment_history'));

router.get('/treatments/by-id/:id', requireRole('admin', 'clinician', 'nurse'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getTreatmentHistoryById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Treatment history not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.patch('/treatments/:id', requireRole('admin', 'clinician'), [
  param('id').isMongoId(),
  body('status').optional().isIn(['planned', 'ongoing', 'completed', 'discontinued']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateTreatmentHistory(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Treatment history not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.delete('/treatments/:id', requireRole('admin', 'clinician'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await deleteTreatmentHistory(req.params.id, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Treatment history not found' });
    return res.json({ success: true, data: { id: item._id, deleted: true } });
  } catch (error) { return next(error); }
});

router.post('/medications', requireRole('admin', 'clinician', 'nurse'), [
  ...validatePatientAndCase,
  body('drugName').trim().notEmpty().withMessage('Drug name is required'),
  body('route').optional().isIn(['oral', 'topical', 'intravenous', 'intramuscular', 'subcutaneous', 'inhaled', 'other']),
  body('status').optional().isIn(['active', 'paused', 'completed', 'discontinued']),
  body('startDate').optional({ nullable: true }).isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  validateRequest
], async (req, res, next) => {
  try {
    if (req.body.startDate && req.body.endDate && new Date(req.body.endDate) < new Date(req.body.startDate)) {
      return res.status(400).json({ success: false, error: 'Medication dates are inconsistent: end date cannot be earlier than the start date.' });
    }
    const item = await createMedication({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.get('/medications/:patientId', requireRole('admin', 'clinician', 'nurse'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], buildListHandler(listMedications, 'medication_history'));

router.get('/medications/by-id/:id', requireRole('admin', 'clinician', 'nurse'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getMedicationById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Medication history not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.patch('/medications/:id', requireRole('admin', 'clinician'), [
  param('id').isMongoId(),
  body('status').optional().isIn(['active', 'paused', 'completed', 'discontinued']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateMedication(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Medication history not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.delete('/medications/:id', requireRole('admin', 'clinician'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await deleteMedication(req.params.id, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Medication history not found' });
    return res.json({ success: true, data: { id: item._id, deleted: true } });
  } catch (error) { return next(error); }
});

router.post('/allergies', requireRole('admin', 'clinician', 'nurse'), [
  ...validatePatientAndCase,
  body('allergen').trim().notEmpty().withMessage('Allergen is required'),
  body('reaction').trim().notEmpty().withMessage('Reaction is required'),
  body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
  body('status').optional().isIn(['active', 'inactive', 'resolved']),
  body('onsetDate').optional({ nullable: true }).isISO8601(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createAllergy({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.get('/allergies/:patientId', requireRole('admin', 'clinician', 'nurse'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], buildListHandler(listAllergies, 'allergy'));

router.get('/allergies/by-id/:id', requireRole('admin', 'clinician', 'nurse'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getAllergyById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Allergy not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.patch('/allergies/:id', requireRole('admin', 'clinician'), [
  param('id').isMongoId(),
  body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
  body('status').optional().isIn(['active', 'inactive', 'resolved']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateAllergy(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Allergy not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.delete('/allergies/:id', requireRole('admin', 'clinician'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await deleteAllergy(req.params.id, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Allergy not found' });
    return res.json({ success: true, data: { id: item._id, deleted: true } });
  } catch (error) { return next(error); }
});

router.post('/comorbidities', requireRole('admin', 'clinician', 'nurse'), [
  ...validatePatientAndCase,
  body('conditionName').trim().notEmpty().withMessage('Condition name is required'),
  body('status').optional().isIn(['active', 'controlled', 'resolved', 'monitoring']),
  body('onsetDate').optional({ nullable: true }).isISO8601(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createComorbidity({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.get('/comorbidities/:patientId', requireRole('admin', 'clinician', 'nurse'), [
  param('patientId').isMongoId(),
  query('caseId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], buildListHandler(listComorbidities, 'comorbidity'));

router.get('/comorbidities/by-id/:id', requireRole('admin', 'clinician', 'nurse'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await getComorbidityById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Comorbidity not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.patch('/comorbidities/:id', requireRole('admin', 'clinician'), [
  param('id').isMongoId(),
  body('status').optional().isIn(['active', 'controlled', 'resolved', 'monitoring']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateComorbidity(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Comorbidity not found' });
    return res.json({ success: true, data: item });
  } catch (error) { return next(error); }
});

router.delete('/comorbidities/:id', requireRole('admin', 'clinician'), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const item = await deleteComorbidity(req.params.id, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Comorbidity not found' });
    return res.json({ success: true, data: { id: item._id, deleted: true } });
  } catch (error) { return next(error); }
});

module.exports = router;
