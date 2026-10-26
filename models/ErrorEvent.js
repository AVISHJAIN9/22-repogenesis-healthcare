const mongoose = require('mongoose');

const errorEventSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  route: { type: String, default: '', trim: true },
  message: { type: String, required: true, trim: true },
  severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'error', index: true },
  fingerprint: { type: String, default: '', trim: true, index: true },
  stack: { type: String, default: '', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ErrorEvent', errorEventSchema);
