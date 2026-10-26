const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { createKnowledgeEntry, searchKnowledgeEntries, getKnowledgeSummary } = require('../services/knowledgeService');
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
  '/entries',
  requireRole('clinician', 'doctor', 'nurse', 'admin'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('category').optional().isString(),
    body('source').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const entry = await createKnowledgeEntry({
        tenantId: req.session?.tenantId || 'default',
        patientId: req.body.patientId || null,
        caseId: req.body.caseId || null,
        title: req.body.title,
        category: req.body.category,
        source: req.body.source,
        excerpt: req.body.excerpt,
        url: req.body.url,
        tags: req.body.tags,
        status: req.body.status
      }, req.user?.email || 'system');

      return res.status(201).json({ success: true, data: entry });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to create knowledge entry', error: error.message });
    }
  }
);

router.get(
  '/search',
  requireRole('clinician', 'doctor', 'nurse', 'admin', 'patient'),
  [
    query('query').optional().isString(),
    query('category').optional().isString(),
    query('status').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await searchKnowledgeEntries({
        query: req.query.query,
        category: req.query.category,
        status: req.query.status
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to search knowledge entries', error: error.message });
    }
  }
);

router.get(
  '/patient/:patientId/summary',
  requireRole('clinician', 'doctor', 'nurse', 'admin', 'patient'),
  async (req, res) => {
    try {
      const summary = await getKnowledgeSummary({ patientId: req.params.patientId, caseId: req.query.caseId || null });
      return res.json({ success: true, data: { summary } });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to get knowledge summary', error: error.message });
    }
  }
);

module.exports = router;
