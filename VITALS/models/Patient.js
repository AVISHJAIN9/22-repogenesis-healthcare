const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  patientNumber: { type: String, unique: true, sparse: true, trim: true, index: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say', ''] },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
  emergencyContactName: { type: String, trim: true },
  emergencyContactPhone: { type: String, trim: true },
  status: { type: String, enum: ['registered', 'active', 'inactive', 'archived'], default: 'registered', index: true },
  consentForTreatment: { type: Boolean, default: true },
  retentionDays: { type: Number, default: 2555, min: 1 },
  retentionExpiresAt: { type: Date, default: null },
  createdBy: { type: String, default: 'system', trim: true },
  updatedBy: { type: String, default: 'system', trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

patientSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Patient', patientSchema);
