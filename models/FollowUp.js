const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  monitoringPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoringPlan', default: null, index: true },
  scheduledFor: { type: Date, default: null },
  type: { type: String, enum: ['check-in', 'assessment', 'review', 'recovery'], default: 'check-in', index: true },
  status: { type: String, enum: ['scheduled', 'completed', 'overdue', 'canceled'], default: 'scheduled', index: true },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'follow_ups' });

module.exports = mongoose.model('FollowUp', followUpSchema);
