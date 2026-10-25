const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createUsageEvent,
  createErrorEvent,
  createMetricSnapshot,
  getObservabilitySummary
} = require('../services/observabilityService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

router.use(requireAuth);

router.post(
  '/usage-events',
  requireRole('clinician', 'admin', 'doctor', 'nurse'),
  [
    body('route').notEmpty().withMessage('Route is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const event = await createUsageEvent({
        tenantId: req.session?.tenantId || 'default',
        route: req.body.route,
        method: req.body.method,
        statusCode: req.body.statusCode,
        durationMs: req.body.durationMs,
        actorRole: req.body.actorRole,
        actorId: req.body.actorId
      });

      return res.status(201).json({ success: true, data: event });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to record usage event', error: error.message });
    }
  }
);

router.post(
  '/errors',
  requireRole('clinician', 'admin', 'doctor', 'nurse'),
  [
    body('message').notEmpty().withMessage('Error message is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const event = await createErrorEvent({
        tenantId: req.session?.tenantId || 'default',
        route: req.body.route,
        message: req.body.message,
        severity: req.body.severity,
        fingerprint: req.body.fingerprint,
        stack: req.body.stack
      });

      return res.status(201).json({ success: true, data: event });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to record error event', error: error.message });
    }
  }
);

router.post(
  '/metrics',
  requireRole('clinician', 'admin', 'doctor', 'nurse'),
  [
    body('name').notEmpty().withMessage('Metric name is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const metric = await createMetricSnapshot({
        tenantId: req.session?.tenantId || 'default',
        name: req.body.name,
        value: req.body.value,
        unit: req.body.unit,
        group: req.body.group
      });

      return res.status(201).json({ success: true, data: metric });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to record metric snapshot', error: error.message });
    }
  }
);

router.get('/summary', requireRole('clinician', 'admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const summary = await getObservabilitySummary({ tenantId: req.session?.tenantId || 'default' });
    return res.json({ success: true, data: { summary } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get observability summary', error: error.message });
  }
});

module.exports = router;
