const mongoose = require('mongoose');

const clinicalOutcomeSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  outcomeType: { type: String, required: true, trim: true },
  value: { type: Number, default: null },
  unit: { type: String, trim: true, default: '' },
  assessedAt: { type: Date, default: null },
  evaluator: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'clinical_outcomes' });

module.exports = mongoose.model('ClinicalOutcome', clinicalOutcomeSchema);
