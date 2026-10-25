const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');

function sanitizePatientPayload(payload = {}) {
  const result = { ...payload };
  if (!result.patientNumber) result.patientNumber = `PT-${Date.now()}`;
  if (result.firstName) result.firstName = String(result.firstName).trim();
  if (result.lastName) result.lastName = String(result.lastName).trim();
  if (result.email) result.email = String(result.email).trim().toLowerCase();
  if (result.phone) result.phone = String(result.phone).trim();
  if (result.address) result.address = String(result.address).trim();
  return result;
}

async function createPatient(data, actor = 'system') {
  const payload = sanitizePatientPayload(data);
  const patient = await Patient.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await AuditLog.create({
    userId: actor,
    action: 'create',
    resourceType: 'patient',
    resourceId: String(patient._id),
    patientId: patient._id,
    details: { patientNumber: patient.patientNumber }
  });

  return patient;
}

async function findPatients(query = {}, options = {}) {
  const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
  const filter = { isDeleted: false, ...(query || {}) };
  const skip = (Number(page) - 1) * Number(limit);
  const docs = await Patient.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean();
  const total = await Patient.countDocuments(filter);
  return { docs, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 };
}

async function getPatientById(id) {
  return Patient.findOne({ _id: id, isDeleted: false }).lean();
}

async function updatePatient(id, payload, actor = 'system') {
  const patient = await Patient.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...sanitizePatientPayload(payload), updatedBy: actor, updatedAt: new Date() },
    { new: true }
  );

  if (patient) {
    await AuditLog.create({
      userId: actor,
      action: 'update',
      resourceType: 'patient',
      resourceId: String(patient._id),
      patientId: patient._id,
      details: { fields: Object.keys(payload || {}) }
    });
  }

  return patient;
}

async function softDeletePatient(id, actor = 'system') {
  return Patient.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), updatedBy: actor },
    { new: true }
  );
}

module.exports = { createPatient, findPatients, getPatientById, updatePatient, softDeletePatient };
