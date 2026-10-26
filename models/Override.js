const mongoose = require('mongoose');

const overrideSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  clinicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  overrideType: {
    type: String,
    enum: ['clinical_exception', 'risk_waiver', 'policy_exception', 'manual_review'],
    default: 'clinical_exception',
    index: true
  },
  reason: { type: String, trim: true, required: true },
  notes: { type: String, trim: true, default: '' },
  approvedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'plan_overrides' });

module.exports = mongoose.model('Override', overrideSchema);
