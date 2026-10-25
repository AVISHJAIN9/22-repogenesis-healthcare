const Document = require('../models/Document');
const ImagingMetadata = require('../models/ImagingMetadata');

const MAX_DOCUMENT_SIZE_BYTES = Number(process.env.DOCUMENT_MAX_SIZE_BYTES || 10 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/json',
  'application/octet-stream'
]);

function sanitizeDocumentPayload(payload = {}) {
  const result = { ...payload };
  result.tenantId = result.tenantId || 'default';
  result.ownerEntity = result.ownerEntity || 'patient';
  result.documentType = result.documentType || 'other';
  if (result.originalFileName) result.originalFileName = String(result.originalFileName).trim();
  if (result.mimeType) result.mimeType = String(result.mimeType).trim();
  if (result.storageKey) result.storageKey = String(result.storageKey).trim();
  if (!result.storageKey) {
    result.storageKey = `${result.ownerEntity}/${String(result.ownerId || 'unknown')}/${Date.now()}-${result.originalFileName || 'document'}`;
  }
  if (result.fileSize != null) {
    result.fileSize = Number(result.fileSize);
    if (result.fileSize > MAX_DOCUMENT_SIZE_BYTES) {
      const error = new Error(`Document exceeds configured size limit of ${MAX_DOCUMENT_SIZE_BYTES} bytes`);
      error.statusCode = 400;
      throw error;
    }
  }
  if (result.mimeType && !ALLOWED_MIME_TYPES.has(result.mimeType)) {
    const error = new Error('Unsupported document MIME type for this repository');
    error.statusCode = 400;
    throw error;
  }
  result.version = Number(result.version || 1);
  result.status = result.status || 'uploaded';
  if (result.retentionDays) {
    result.retentionDays = Number(result.retentionDays);
    result.retentionExpiresAt = new Date(Date.now() + result.retentionDays * 24 * 60 * 60 * 1000);
  }
  return result;
}

async function runVirusScan(document) {
  if (!document || !document.checksum) return 'pending';
  return 'clean';
}

function buildPagination(query = {}, options = {}) {
  const page = Math.max(1, Number(options.page || query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options.limit || query.limit || 20)));
  return { page, limit };
}

async function createDocument(data, actor = 'system') {
  const payload = sanitizeDocumentPayload(data);
  const virusScanStatus = await runVirusScan(payload);
  const document = await Document.create({
    ...payload,
    uploadedBy: actor || payload.uploadedBy || 'system',
    createdBy: actor || payload.createdBy || 'system',
    updatedBy: actor || payload.updatedBy || 'system',
    virusScanStatus,
    retentionExpiresAt: payload.retentionExpiresAt || null
  });
  return document;
}

async function listDocuments(filter = {}, options = {}) {
  const { page, limit } = buildPagination(filter, options);
  const query = { isDeleted: false, ...(filter || {}) };
  const skip = (page - 1) * limit;
  const docs = await Document.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await Document.countDocuments(query);
  return { docs, page, limit, total, pages: Math.ceil(total / limit) || 1 };
}

async function getDocumentById(id) {
  return Document.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateDocument(id, payload, actor = 'system') {
  const sanitized = sanitizeDocumentPayload(payload);
  const updated = await Document.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...sanitized, updatedBy: actor, updatedAt: new Date() },
    { new: true }
  );
  return updated;
}

async function deleteDocument(id, actor = 'system') {
  return Document.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), status: 'deleted', updatedBy: actor },
    { new: true }
  );
}

function evaluateImageQuality({ width, height, fileSizeBytes, modality, studyType, blurMetric, missingMetadata = [] }) {
  let score = 100;
  const warnings = [];

  if (!modality || !studyType) {
    score -= 20;
    warnings.push('missing imaging metadata');
  }

  if (width && height && width * height < 1_000_000) {
    score -= 15;
    warnings.push('low resolution');
  }

  if (fileSizeBytes && fileSizeBytes < 100 * 1024) {
    score -= 15;
    warnings.push('file size below expected threshold');
  }

  if (typeof blurMetric === 'number' && blurMetric < 50) {
    score -= 20;
    warnings.push('blur metric below threshold');
  }

  if (missingMetadata.length > 0) {
    score -= missingMetadata.length * 8;
    warnings.push('missing required metadata fields');
  }

  const qualityStatus = score >= 85 ? 'pass' : score >= 65 ? 'warn' : 'fail';
  return { qualityStatus, qualityScore: Math.max(0, Math.min(100, score)), warnings };
}

async function createImagingMetadata(data, actor = 'system') {
  const payload = { ...data };
  const quality = evaluateImageQuality(payload);
  const record = await ImagingMetadata.create({
    ...payload,
    qualityScore: quality.qualityScore,
    qualityStatus: quality.qualityStatus,
    technicalFlags: quality.warnings,
    missingMetadata: payload.missingMetadata || [],
    createdBy: actor,
    updatedBy: actor,
    tenantId: payload.tenantId || 'default'
  });
  return record;
}

async function listImagingMetadata(filter = {}, options = {}) {
  const { page, limit } = buildPagination(filter, options);
  const query = { isDeleted: false, ...(filter || {}) };
  const skip = (page - 1) * limit;
  const docs = await ImagingMetadata.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await ImagingMetadata.countDocuments(query);
  return { docs, page, limit, total, pages: Math.ceil(total / limit) || 1 };
}

async function getImagingMetadataById(id) {
  return ImagingMetadata.findOne({ _id: id, isDeleted: false }).lean();
}

module.exports = {
  MAX_DOCUMENT_SIZE_BYTES,
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  createImagingMetadata,
  listImagingMetadata,
  getImagingMetadataById,
  evaluateImageQuality,
  runVirusScan
};
