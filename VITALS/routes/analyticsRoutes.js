const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createProtocol,
  createEvidenceLink,
  recordAnalyticsSnapshot,
  getAnalyticsSummary
} = require('../services/analyticsService');
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
  '/protocols',
  requireRole('clinician', 'doctor', 'nurse', 'admin'),
  [
    body('name').notEmpty().withMessage('Protocol name is required'),
    body('category').optional().isString(),
    body('summary').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const protocol = await createProtocol({
        tenantId: req.session?.tenantId || 'default',
        name: req.body.name,
        category: req.body.category,
        version: req.body.version,
        status: req.body.status,
        summary: req.body.summary
      }, req.user?.email || 'system');

      return res.status(201).json({ success: true, data: protocol });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to create protocol', error: error.message });
    }
  }
);

router.post(
  '/evidence',
  requireRole('clinician', 'doctor', 'nurse', 'admin'),
  [
    body('protocolId').notEmpty().withMessage('Protocol ID is required'),
    body('title').notEmpty().withMessage('Title is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const evidence = await createEvidenceLink({
        tenantId: req.session?.tenantId || 'default',
        protocolId: req.body.protocolId,
        title: req.body.title,
        citation: req.body.citation,
        sourceType: req.body.sourceType,
        summary: req.body.summary,
        url: req.body.url
      }, req.user?.email || 'system');

      return res.status(201).json({ success: true, data: evidence });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to create evidence link', error: error.message });
    }
  }
);

router.post(
  '/snapshots',
  requireRole('clinician', 'doctor', 'nurse', 'admin'),
  [
    body('metricName').notEmpty().withMessage('Metric name is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const snapshot = await recordAnalyticsSnapshot({
        tenantId: req.session?.tenantId || 'default',
        metricName: req.body.metricName,
        value: req.body.value,
        unit: req.body.unit,
        category: req.body.category,
        summary: req.body.summary
      }, req.user?.email || 'system');

      return res.status(201).json({ success: true, data: snapshot });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to record analytics snapshot', error: error.message });
    }
  }
);

router.get('/summary', requireRole('clinician', 'doctor', 'nurse', 'admin'), async (req, res) => {
  try {
    const summary = await getAnalyticsSummary({ tenantId: req.session?.tenantId || 'default' });
    return res.json({ success: true, data: { summary } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get analytics summary', error: error.message });
  }
});

module.exports = router;
