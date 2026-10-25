const mongoose = require('mongoose');

const biomarkerFollowUpSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  markerName: { type: String, required: true, trim: true },
  value: { type: Number, default: null },
  unit: { type: String, trim: true, default: '' },
  measuredAt: { type: Date, default: null },
  changeFromBaseline: { type: Number, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'biomarker_follow_ups' });

module.exports = mongoose.model('BiomarkerFollowUp', biomarkerFollowUpSchema);
