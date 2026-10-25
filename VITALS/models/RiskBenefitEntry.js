const mongoose = require('mongoose');

const riskBenefitEntrySchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  therapy: { type: String, trim: true, default: '' },
  riskLevel: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate', index: true },
  benefitLevel: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate', index: true },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  benefitScore: { type: Number, default: 0, min: 0, max: 100 },
  risks: [{ type: String, trim: true }],
  benefits: [{ type: String, trim: true }],
  summary: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'risk_benefit_entries' });

module.exports = mongoose.model('RiskBenefitEntry', riskBenefitEntrySchema);
