const mongoose = require('mongoose');

const questionnaireResponseSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  questionnaireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Questionnaire', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', required: true, index: true },
  responses: { type: mongoose.Schema.Types.Mixed, default: {} },
  submittedAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'questionnaire_responses' });

module.exports = mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);
