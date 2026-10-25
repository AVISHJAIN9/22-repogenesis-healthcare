const mongoose = require('mongoose');

const comorbiditySchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  conditionName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'resolved', 'monitoring', 'unknown'], default: 'active', index: true },
  onsetDate: { type: Date },
  notes: { type: String, trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

comorbiditySchema.index({ patientId: 1, caseId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('Comorbidity', comorbiditySchema);
