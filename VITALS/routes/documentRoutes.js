const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  createImagingMetadata,
  listImagingMetadata,
  getImagingMetadataById
} = require('../services/documentService');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })) });
  }
  return next();
};

router.use(requireAuth);

router.get('/health', requireRole('admin', 'clinician', 'nurse'), requirePermission('audit:read'), async (req, res, next) => {
  try {
    return res.json({ success: true, data: { status: 'ok', database: 'connected' } });
  } catch (error) {
    return next(error);
  }
});

router.get('/', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('patient:read'), [
  query('ownerEntity').optional().isIn(['patient', 'case', 'clinical', 'user']),
  query('ownerId').optional().isMongoId(),
  query('documentType').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], async (req, res, next) => {
  try {
    const filter = {
      tenantId: req.user.tenantId || 'default',
      ...(req.query.ownerEntity ? { ownerEntity: req.query.ownerEntity } : {}),
      ...(req.query.ownerId ? { ownerId: req.query.ownerId } : {}),
      ...(req.query.documentType ? { documentType: req.query.documentType } : {})
    };
    if (req.user.role === 'patient') {
      filter.ownerEntity = 'patient';
      filter.ownerId = req.user.patientId || req.user._id;
    }
    const docs = await listDocuments(filter, { page: req.query.page || 1, limit: req.query.limit || 20 });
    return res.json({ success: true, data: docs });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireRole('admin', 'clinician', 'nurse'), requirePermission('patient:write'), [
  body('ownerEntity').isIn(['patient', 'case', 'clinical', 'user']).withMessage('ownerEntity is required'),
  body('ownerId').isMongoId().withMessage('ownerId must be a valid Mongo ObjectId'),
  body('originalFileName').trim().notEmpty().withMessage('originalFileName is required'),
  body('storageKey').trim().notEmpty().withMessage('storageKey is required'),
  body('mimeType').optional().isString().withMessage('mimeType must be a string'),
  body('fileSize').optional().isInt({ min: 1 }).withMessage('fileSize must be a positive integer'),
  body('version').optional().isInt({ min: 1 }).withMessage('version must be a positive integer'),
  body('documentType').optional().isString(),
  body('checksum').optional().isString(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createDocument({
      ...req.body,
      tenantId: req.user.tenantId || 'default',
      uploadedBy: req.user.username || req.user.name || req.user._id.toString()
    }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/download/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('patient:read'), [
  param('id').isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await getDocumentById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Document not found' });
    return res.json({ success: true, data: { ...item, downloadUrl: `/api/documents/download/${item._id}` } });
  } catch (error) {
    return next(error);
  }
});

router.get('/imaging', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), [
  query('patientId').optional().isMongoId(),
  query('caseId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], async (req, res, next) => {
  try {
    const filter = { tenantId: req.user.tenantId || 'default' };
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.caseId) filter.caseId = req.query.caseId;
    const docs = await listImagingMetadata(filter, { page: req.query.page || 1, limit: req.query.limit || 20 });
    return res.json({ success: true, data: docs });
  } catch (error) {
    return next(error);
  }
});

router.post('/imaging', requireRole('admin', 'clinician', 'nurse'), requirePermission('clinical:write'), [
  body('patientId').isMongoId().withMessage('patientId is required'),
  body('caseId').optional().isMongoId(),
  body('modality').optional().isIn(['X-ray', 'MRI', 'CT', 'Ultrasound', 'PET', 'Other']),
  body('studyType').optional().isString(),
  body('storageKey').optional().isString(),
  body('qualityStatus').optional().isIn(['pass', 'warn', 'fail']),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await createImagingMetadata({ ...req.body, tenantId: req.user.tenantId || 'default' }, req.user._id.toString());
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/imaging/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('clinical:read'), [
  param('id').isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await getImagingMetadataById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Imaging metadata not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', requireRole('admin', 'clinician', 'nurse', 'patient'), requirePermission('patient:read'), [
  param('id').isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await getDocumentById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Document not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireRole('admin', 'clinician', 'nurse'), requirePermission('patient:write'), [
  param('id').isMongoId(),
  body('status').optional().isIn(['draft', 'uploaded', 'validated', 'quarantined', 'archived', 'deleted']),
  body('notes').optional().isString(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await updateDocument(req.params.id, req.body, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Document not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireRole('admin', 'clinician', 'nurse'), requirePermission('patient:write'), [
  param('id').isMongoId(),
  validateRequest
], async (req, res, next) => {
  try {
    const item = await deleteDocument(req.params.id, req.user._id.toString());
    if (!item) return res.status(404).json({ success: false, error: 'Document not found' });
    return res.json({ success: true, data: { id: item._id, deleted: true } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
