const mongoose = require('mongoose');

const knowledgeBaseEntrySchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null, index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', default: null, index: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'general', trim: true, index: true },
  source: { type: String, default: 'manual', trim: true },
  excerpt: { type: String, default: '', trim: true },
  url: { type: String, default: '', trim: true },
  tags: [{ type: String, trim: true }],
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active', index: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

knowledgeBaseEntrySchema.index({ tenantId: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeBaseEntry', knowledgeBaseEntrySchema);
