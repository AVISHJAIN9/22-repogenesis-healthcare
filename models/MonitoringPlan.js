const mongoose = require('mongoose');

const monitoringPlanSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft', index: true },
  followUpIntervalDays: { type: Number, default: 14, min: 1 },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'monitoring_plans' });

module.exports = mongoose.model('MonitoringPlan', monitoringPlanSchema);
