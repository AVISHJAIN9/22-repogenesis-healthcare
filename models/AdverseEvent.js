const mongoose = require('mongoose');

const adverseEventSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  eventType: { type: String, required: true, trim: true },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'], default: 'moderate', index: true },
  description: { type: String, required: true, trim: true },
  detectedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'monitoring', 'resolved'], default: 'open', index: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'adverse_events' });

module.exports = mongoose.model('AdverseEvent', adverseEventSchema);
