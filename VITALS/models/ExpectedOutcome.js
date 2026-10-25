const mongoose = require('mongoose');

const expectedOutcomeSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  therapy: { type: String, trim: true, default: '' },
  label: { type: String, trim: true, required: true },
  metric: { type: String, trim: true, default: '' },
  target: { type: String, trim: true, default: '' },
  probability: { type: Number, default: 0, min: 0, max: 100 },
  timelineDays: { type: Number, default: 30, min: 1 },
  rationale: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'expected_outcomes' });

module.exports = mongoose.model('ExpectedOutcome', expectedOutcomeSchema);
