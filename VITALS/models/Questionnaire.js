const mongoose = require('mongoose');

const questionnaireSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', default: null, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  questions: [{ type: String, trim: true }],
  active: { type: Boolean, default: true, index: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'questionnaires' });

module.exports = mongoose.model('Questionnaire', questionnaireSchema);
