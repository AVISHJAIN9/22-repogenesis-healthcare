const mongoose = require('mongoose');

const evidenceLinkSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  protocolId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProtocolKnowledge', required: true, index: true },
  title: { type: String, required: true, trim: true },
  citation: { type: String, default: '', trim: true },
  sourceType: { type: String, default: 'journal', trim: true },
  summary: { type: String, default: '', trim: true },
  url: { type: String, default: '', trim: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('EvidenceLink', evidenceLinkSchema);
