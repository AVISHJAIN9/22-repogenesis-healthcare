const mongoose = require('mongoose');

const imagingFollowUpSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  studyType: { type: String, required: true, trim: true },
  studyDate: { type: Date, default: null },
  findings: { type: String, trim: true, default: '' },
  comparedToBaseline: { type: Boolean, default: false },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'imaging_follow_ups' });

module.exports = mongoose.model('ImagingFollowUp', imagingFollowUpSchema);
