const mongoose = require('mongoose');

const jobRunSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  jobName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed'], default: 'queued', index: true },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  errorMessage: { type: String, default: '', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('JobRun', jobRunSchema);
