const mongoose = require('mongoose');

const planVersionSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  target: { type: String, required: true, trim: true },
  objective: { type: String, required: true, trim: true },
  therapy: { type: String, required: true, trim: true },
  components: [{ type: Object, default: [] }],
  timeline: [{ type: Object, default: [] }],
  status: { type: String, enum: ['draft', 'under_review', 'approved', 'rejected'], default: 'draft' },
  notes: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false, index: true }
}, { collection: 'plan_versions' });

planVersionSchema.index({ tenantId: 1, planId: 1, version: 1 });

module.exports = mongoose.model('PlanVersion', planVersionSchema);
