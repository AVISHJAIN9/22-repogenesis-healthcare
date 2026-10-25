const mongoose = require('mongoose');

const timelinePhaseSchema = new mongoose.Schema({
  phase: { type: String, required: true, trim: true },
  startOffsetDays: { type: Number, default: 0 },
  durationDays: { type: Number, default: 7 },
  dependencies: [{ type: String, trim: true }],
  scheduledDate: { type: Date, default: null }
}, { _id: false });

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  dose: { type: String, trim: true, default: '' },
  schedule: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  order: { type: Number, default: 0 }
}, { _id: false });

const treatmentPlanSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  target: { type: String, required: true, trim: true },
  objective: { type: String, required: true, trim: true },
  therapy: { type: String, required: true, trim: true },
  components: [componentSchema],
  timeline: [timelinePhaseSchema],
  status: { type: String, enum: ['draft', 'under_review', 'approved', 'rejected'], default: 'draft', index: true },
  version: { type: Number, default: 1, min: 1 },
  notes: { type: String, trim: true, default: '' },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

treatmentPlanSchema.index({ tenantId: 1, patientId: 1, caseId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('TreatmentPlan', treatmentPlanSchema);
