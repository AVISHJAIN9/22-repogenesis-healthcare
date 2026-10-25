const mongoose = require('mongoose');

const eligibilityResultSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  therapy: { type: String, trim: true, default: '' },
  eligible: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['eligible', 'ineligible', 'requires_review'], default: 'requires_review', index: true },
  rationale: { type: String, trim: true, default: '' },
  checks: [{
    field: { type: String, trim: true },
    description: { type: String, trim: true },
    passed: { type: Boolean, default: false },
    detail: { type: String, trim: true, default: '' }
  }],
  contraindications: [{
    ruleName: { type: String, trim: true },
    severity: { type: String, trim: true },
    message: { type: String, trim: true },
    recommendation: { type: String, trim: true }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'eligibility_results' });

module.exports = mongoose.model('EligibilityResult', eligibilityResultSchema);
