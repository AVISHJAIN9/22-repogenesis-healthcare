const mongoose = require('mongoose');

const protocolKnowledgeSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'general', trim: true, index: true },
  version: { type: String, default: 'v1', trim: true },
  status: { type: String, enum: ['draft', 'active', 'deprecated'], default: 'active', index: true },
  summary: { type: String, default: '', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

protocolKnowledgeSchema.index({ tenantId: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('ProtocolKnowledge', protocolKnowledgeSchema);
