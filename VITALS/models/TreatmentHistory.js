const mongoose = require('mongoose');

const treatmentHistorySchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  treatmentType: { type: String, required: true, trim: true },
  priorTreatment: { type: String, trim: true },
  outcome: { type: String, trim: true },
  status: { type: String, enum: ['planned', 'active', 'ongoing', 'completed', 'discontinued'], default: 'completed', index: true },
  startDate: { type: Date },
  endDate: { type: Date },
  notes: { type: String, trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

treatmentHistorySchema.index({ patientId: 1, caseId: 1, createdAt: -1 });
module.exports = mongoose.model('TreatmentHistory', treatmentHistorySchema);
