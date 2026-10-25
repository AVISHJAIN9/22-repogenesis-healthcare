const mongoose = require('mongoose');

const medicationHistorySchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  drugName: { type: String, required: true, trim: true },
  dose: { type: String, trim: true },
  frequency: { type: String, trim: true },
  route: {
    type: String,
    enum: ['oral', 'intravenous', 'topical', 'inhalation', 'intramuscular', 'subcutaneous', 'other'],
    default: 'oral',
    index: true
  },
  status: { type: String, enum: ['active', 'completed', 'discontinued', 'planned'], default: 'active', index: true },
  startDate: { type: Date },
  endDate: { type: Date },
  notes: { type: String, trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

medicationHistorySchema.index({ patientId: 1, caseId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('MedicationHistory', medicationHistorySchema);
