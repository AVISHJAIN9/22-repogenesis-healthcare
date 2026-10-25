const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
  type: {
    type: String,
    enum: ['follow_up', 'milestone', 'trend', 'safety'],
    default: 'follow_up',
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'resolved'],
    default: 'open',
    index: true
  },
  acknowledgedBy: { type: String, default: '', trim: true },
  acknowledgedAt: { type: Date, default: null },
  source: { type: String, default: 'manual', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

alertSchema.index({ tenantId: 1, patientId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
