const mongoose = require('mongoose');

const eligibilityCriteriaSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  therapy: { type: String, trim: true, default: '' },
  checks: [{
    field: { type: String, trim: true },
    description: { type: String, trim: true },
    passed: { type: Boolean, default: false },
    detail: { type: String, trim: true, default: '' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'eligibility_criteria' });

module.exports = mongoose.model('EligibilityCriteria', eligibilityCriteriaSchema);
