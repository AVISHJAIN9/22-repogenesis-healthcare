const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  name: { type: String, required: true, trim: true },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe', 'critical'],
    default: 'moderate',
    index: true
  },
  onsetDate: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['active', 'resolved', 'chronic', 'monitoring'], default: 'active', index: true },
  notes: { type: String, trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

symptomSchema.index({ patientId: 1, caseId: 1, createdAt: -1 });
module.exports = mongoose.model('Symptom', symptomSchema);
