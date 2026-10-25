const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  diagnosisName: { type: String, required: true, trim: true },
  diagnosisCode: { type: String, trim: true },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'], default: 'moderate' },
  status: { type: String, enum: ['working', 'confirmed', 'ruled_out', 'deferred'], default: 'working', index: true },
  notes: { type: String, trim: true },
  clinicianName: { type: String, trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

diagnosisSchema.index({ caseId: 1, createdAt: -1 });
module.exports = mongoose.model('Diagnosis', diagnosisSchema);
