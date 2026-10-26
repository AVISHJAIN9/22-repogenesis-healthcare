const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'default', index: true },
  userId: { type: String, index: true },
  userRole: { type: String },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', index: true },
  details: { type: Object, default: {} },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
}, { collection: 'audit_logs' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
