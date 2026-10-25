const mongoose = require('mongoose');

const caseTimelineEventSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  type: {
    type: String,
    enum: ['case_update', 'plan', 'alert', 'milestone', 'progress', 'follow_up'],
    default: 'case_update',
    index: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  eventDate: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

caseTimelineEventSchema.index({ tenantId: 1, caseId: 1, eventDate: -1 });

module.exports = mongoose.model('CaseTimelineEvent', caseTimelineEventSchema);
