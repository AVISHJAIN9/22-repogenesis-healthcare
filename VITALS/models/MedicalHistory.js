const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  pastMedicalHistory: [{ type: String }],
  surgicalHistory: [{ type: String }],
  allergies: [{ type: String }],
  currentMedications: [{ type: String }],
  comorbidities: [{ type: String }],
  familyHistory: [{ type: String }],
  smokingStatus: { type: String, enum: ['never', 'former', 'current', 'unknown'], default: 'unknown' },
  alcoholUse: { type: String, enum: ['none', 'occasional', 'regular', 'unknown'], default: 'unknown' },
  notes: { type: String, trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

medicalHistorySchema.index({ patientId: 1, caseId: 1 });
module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
