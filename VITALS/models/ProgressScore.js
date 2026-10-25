const mongoose = require('mongoose');

const progressScoreSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  baselineScore: { type: Number, default: 0, min: 0, max: 100 },
  category: { type: String, required: true, trim: true },
  windowLabel: { type: String, trim: true, default: '' },
  delta: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['improving', 'stable', 'concern'],
    default: 'stable'
  },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

progressScoreSchema.index({ tenantId: 1, patientId: 1, caseId: 1, createdAt: -1 });

module.exports = mongoose.model('ProgressScore', progressScoreSchema);
