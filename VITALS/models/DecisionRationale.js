const mongoose = require('mongoose');

const decisionRationaleSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  therapy: { type: String, trim: true, default: '' },
  rationale: { type: String, trim: true, required: true },
  summary: { type: String, trim: true, default: '' },
  overrideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Override', default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'decision_rationales' });

module.exports = mongoose.model('DecisionRationale', decisionRationaleSchema);
