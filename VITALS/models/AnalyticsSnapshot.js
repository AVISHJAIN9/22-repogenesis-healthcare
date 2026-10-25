const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  metricName: { type: String, required: true, trim: true, index: true },
  value: { type: Number, default: 0 },
  unit: { type: String, default: '', trim: true },
  category: { type: String, default: 'general', trim: true },
  summary: { type: String, default: '', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

analyticsSnapshotSchema.index({ tenantId: 1, metricName: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
