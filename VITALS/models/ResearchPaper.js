const mongoose = require('mongoose');

const researchPaperSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  title: { type: String, required: true, trim: true },
  authors: [{ type: String, trim: true }],
  journal: { type: String, default: '', trim: true },
  year: { type: Number, min: 1900, default: null },
  doi: { type: String, default: '', trim: true },
  summary: { type: String, default: '', trim: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ResearchPaper', researchPaperSchema);
