const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan', default: null, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'missed'], default: 'pending', index: true },
  dueDate: { type: Date, default: null },
  completionDate: { type: Date, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'milestones' });

module.exports = mongoose.model('Milestone', milestoneSchema);
