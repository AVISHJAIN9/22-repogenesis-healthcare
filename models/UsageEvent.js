const mongoose = require('mongoose');

const usageEventSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  route: { type: String, required: true, trim: true },
  method: { type: String, default: 'GET', trim: true, index: true },
  statusCode: { type: Number, default: 200 },
  durationMs: { type: Number, default: 0 },
  actorRole: { type: String, default: 'system', trim: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

usageEventSchema.index({ tenantId: 1, route: 1, createdAt: -1 });

module.exports = mongoose.model('UsageEvent', usageEventSchema);
