const mongoose = require('mongoose');

const metricSnapshotSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  name: { type: String, required: true, trim: true, index: true },
  value: { type: Number, default: 0 },
  unit: { type: String, default: '', trim: true },
  group: { type: String, default: 'system', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('MetricSnapshot', metricSnapshotSchema);
