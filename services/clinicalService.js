const MedicalHistory = require('../models/MedicalHistory');
const Diagnosis = require('../models/Diagnosis');
const AuditLog = require('../models/AuditLog');

async function upsertMedicalHistory(data, actor = 'system') {
  const query = { patientId: data.patientId, caseId: data.caseId || null };
  const payload = {
    ...data,
    patientId: data.patientId,
    caseId: data.caseId || null,
    createdBy: actor,
    updatedBy: actor
  };

  const item = await MedicalHistory.findOneAndUpdate(
    query,
    { $set: { ...payload, updatedAt: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await AuditLog.create({
    userId: actor,
    action: 'update',
    resourceType: 'medical_history',
    resourceId: String(item._id),
    patientId: item.patientId,
    caseId: item.caseId,
    details: { patientId: String(item.patientId), caseId: item.caseId ? String(item.caseId) : null }
  });

  return item;
}

async function getMedicalHistory(patientId, caseId) {
  return MedicalHistory.find({ patientId, ...(caseId ? { caseId } : {}), isDeleted: false }).sort({ createdAt: -1 }).lean();
}

async function addDiagnosis(data, actor = 'system') {
  const item = await Diagnosis.create({
    ...data,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await AuditLog.create({
    userId: actor,
    action: 'create',
    resourceType: 'diagnosis',
    resourceId: String(item._id),
    patientId: item.patientId,
    caseId: item.caseId,
    details: { diagnosisName: item.diagnosisName }
  });

  return item;
}

async function getDiagnoses(caseId, patientId) {
  return Diagnosis.find({ caseId, patientId, isDeleted: false }).sort({ createdAt: -1 }).lean();
}

async function updateDiagnosis(id, data, actor = 'system') {
  const item = await Diagnosis.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...data, updatedBy: actor, updatedAt: new Date() },
    { new: true }
  );

  if (item) {
    await AuditLog.create({
      userId: actor,
      action: 'update',
      resourceType: 'diagnosis',
      resourceId: String(item._id),
      patientId: item.patientId,
      caseId: item.caseId,
      details: { diagnosisName: item.diagnosisName }
    });
  }

  return item;
}

module.exports = { upsertMedicalHistory, getMedicalHistory, addDiagnosis, getDiagnoses, updateDiagnosis };
