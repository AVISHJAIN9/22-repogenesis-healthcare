const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['admin', 'clinician', 'nurse', 'researcher', 'patient'], default: 'clinician' },
  permissions: [{ type: String, trim: true }],
  tenantId: { type: String, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true, default: null },
  assignedPatientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],
  assignedCaseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CareCase' }],
  refreshTokens: [{ type: String }],
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  mfaEnabled: { type: Boolean, default: false },
  lastLoginAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'employees' });

userSchema.index({ tenantId: 1, role: 1, isDeleted: 1 });
module.exports = mongoose.model('User', userSchema);
