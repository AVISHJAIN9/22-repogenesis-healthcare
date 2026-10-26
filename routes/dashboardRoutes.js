const express = require('express');
const { param, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const { getPatientDashboardSummary, getClinicianDashboardSummary } = require('../services/dashboardService');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
};

router.use(requireAuth);

router.get('/patient/:patientId/summary', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), [
  param('patientId').isMongoId().withMessage('patientId is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await getPatientDashboardSummary(req.params.patientId, req.user._id.toString());
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get('/clinician/:userId/summary', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:read'), [
  param('userId').isMongoId().withMessage('userId is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const data = await getClinicianDashboardSummary(req.params.userId, req.user._id.toString());
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
