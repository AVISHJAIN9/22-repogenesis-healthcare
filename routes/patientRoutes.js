const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission, requirePatientScope } = require('../middleware/auth');
const { createPatient, findPatients, getPatientById, updatePatient, softDeletePatient } = require('../services/patientService');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(err => ({ field: err.path, msg: err.msg })) });
  }
  return next();
};

const patientValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Email must be valid'),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ min: 7 }).withMessage('Phone must be at least 7 characters')
];

router.use(requireAuth);

router.get('/', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('patient:read'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
, validateRequest], async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const filter = search ? {
      $or: [
        { firstName: new RegExp(String(search), 'i') },
        { lastName: new RegExp(String(search), 'i') },
        { patientNumber: new RegExp(String(search), 'i') },
        { email: new RegExp(String(search), 'i') }
      ]
    } : {};

    if (req.user.role === 'patient' && req.user.patientId) {
      filter._id = req.user.patientId;
    }

    const result = await findPatients(filter, { page, limit });
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireRole('admin', 'clinician', 'nurse'), requirePermission('patient:write'), [...patientValidation, validateRequest], async (req, res, next) => {
  try {
    const patient = await createPatient({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: patient });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('patient:read'), requirePatientScope(), [param('id').isMongoId(), validateRequest], async (req, res, next) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    return res.json({ success: true, data: patient });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('patient:write'), requirePatientScope(), [...patientValidation, validateRequest], async (req, res, next) => {
  try {
    const patient = await updatePatient(req.params.id, req.body, req.user._id.toString());
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    return res.json({ success: true, data: patient });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireRole('admin', 'clinician'), requirePermission('patient:write'), requirePatientScope(), async (req, res, next) => {
  try {
    const patient = await softDeletePatient(req.params.id, req.user._id.toString());
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    return res.json({ success: true, data: { id: patient._id, deleted: true } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
