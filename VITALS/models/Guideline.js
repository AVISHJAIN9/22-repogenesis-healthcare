const mongoose = require('mongoose');

const guidelineSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, default: '', trim: true },
  source: { type: String, default: '', trim: true },
  section: { type: String, default: '', trim: true },
  status: { type: String, enum: ['draft', 'active', 'retired'], default: 'active', index: true },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Guideline', guidelineSchema);
