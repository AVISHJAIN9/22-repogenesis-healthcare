const mongoose = require('mongoose');

const imagingMetadataSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
  modality: { type: String, enum: ['X-ray', 'MRI', 'CT', 'Ultrasound', 'PET', 'Other'], default: 'Other', index: true },
  studyType: { type: String, trim: true },
  sourceSystem: { type: String, trim: true },
  acquisitionDate: { type: Date },
  imageCount: { type: Number, default: 1, min: 1 },
  width: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
  fileSizeBytes: { type: Number, min: 0 },
  storageKey: { type: String, trim: true },
  checksum: { type: String, trim: true },
  qualityScore: { type: Number, default: 0, min: 0, max: 100 },
  qualityStatus: { type: String, enum: ['pass', 'warn', 'fail'], default: 'warn', index: true },
  blurMetric: { type: Number, min: 0 },
  missingMetadata: [{ type: String }],
  technicalFlags: [{ type: String }],
  notes: { type: String, trim: true },
  status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active', index: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

imagingMetadataSchema.index({ tenantId: 1, patientId: 1, caseId: 1, qualityStatus: 1 });

module.exports = mongoose.model('ImagingMetadata', imagingMetadataSchema);
