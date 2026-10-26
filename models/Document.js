const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  ownerEntity: { type: String, required: true, enum: ['patient', 'case', 'clinical', 'user'], index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  documentType: { type: String, enum: ['consent', 'report', 'scan', 'lab', 'imaging', 'clinical_note', 'other'], default: 'other', index: true },
  originalFileName: { type: String, required: true, trim: true },
  mimeType: { type: String, default: 'application/octet-stream', trim: true },
  fileSize: { type: Number, default: 0, min: 0 },
  storageProvider: { type: String, default: 'local', enum: ['local', 's3', 'gcs', 'azure'], index: true },
  storageKey: { type: String, required: true, trim: true, index: true },
  checksum: { type: String, trim: true, index: true },
  version: { type: Number, default: 1, min: 1 },
  previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  uploadedBy: { type: String, default: 'system', trim: true, index: true },
  status: { type: String, enum: ['draft', 'uploaded', 'validated', 'quarantined', 'archived', 'deleted'], default: 'uploaded', index: true },
  virusScanStatus: { type: String, enum: ['pending', 'clean', 'infected', 'manual_review'], default: 'pending', index: true },
  retentionDays: { type: Number, default: 3650, min: 1 },
  retentionExpiresAt: { type: Date, default: null },
  notes: { type: String, trim: true },
  metadata: { type: Object, default: {} },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

documentSchema.index({ tenantId: 1, ownerEntity: 1, ownerId: 1, documentType: 1, isDeleted: 1 });

module.exports = mongoose.model('Document', documentSchema);
