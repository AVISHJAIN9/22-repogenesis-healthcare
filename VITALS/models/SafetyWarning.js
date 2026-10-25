const mongoose = require('mongoose');

const safetyWarningSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning', index: true },
  status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active', index: true },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acknowledgedAt: { type: Date, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'safety_warnings' });

module.exports = mongoose.model('SafetyWarning', safetyWarningSchema);
