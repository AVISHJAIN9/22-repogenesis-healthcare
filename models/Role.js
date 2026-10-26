const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: ['admin', 'clinician', 'nurse', 'researcher', 'patient'], trim: true, index: true },
  permissions: [{ type: String, trim: true }],
  tenantId: { type: String, default: 'default', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'roles' });

module.exports = mongoose.model('Role', roleSchema);
