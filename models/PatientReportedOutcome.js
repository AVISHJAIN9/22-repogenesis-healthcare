const mongoose = require('mongoose');

const patientReportedOutcomeSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  instrument: { type: String, required: true, trim: true },
  score: { type: Number, default: null },
  completionDate: { type: Date, default: null },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'patient_reported_outcomes' });

module.exports = mongoose.model('PatientReportedOutcome', patientReportedOutcomeSchema);
