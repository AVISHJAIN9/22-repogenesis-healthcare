const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseNumber: { type: String, unique: true, sparse: true, trim: true, index: true },
  status: {
    type: String,
    enum: ['new', 'intake', 'under_review', 'accepted', 'in_treatment', 'monitoring', 'completed', 'closed'],
    default: 'new',
    index: true
  },
  caseType: { type: String, trim: true },
  chiefComplaint: { type: String, trim: true },
  treatmentGoal: { type: String, trim: true },
  clinicalNotes: { type: String, trim: true },
  assignedClinician: { type: String, trim: true },
  retentionDays: { type: Number, default: 2555, min: 1 },
  retentionExpiresAt: { type: Date, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

caseSchema.index({ patientId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('CareCase', caseSchema);
