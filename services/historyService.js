const Symptom = require('../models/Symptom');
const TreatmentHistory = require('../models/TreatmentHistory');
const MedicationHistory = require('../models/MedicationHistory');
const Allergy = require('../models/Allergy');
const Comorbidity = require('../models/Comorbidity');
const AuditLog = require('../models/AuditLog');

function buildFilter(patientId, caseId = null, extra = {}) {
  const filter = { patientId, isDeleted: false, ...extra };
  if (caseId) filter.caseId = caseId;
  return filter;
}

async function logAudit({ userId, action, resourceType, resourceId, patientId, caseId, details = {} }) {
  await AuditLog.create({
    userId: userId || 'system',
    action,
    resourceType,
    resourceId: String(resourceId),
    patientId,
    caseId,
    details: {
      ...details,
      redacted: true
    }
  });
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateDateRange(startDate, endDate, label = 'Dates') {
  if (!startDate && !endDate) return null;
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (start && end && end < start) {
    throw new Error(`${label} are inconsistent: end date cannot be earlier than start date.`);
  }
  return { start, end };
}

async function listResource(Model, patientId, caseId, options = {}) {
  const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
  const query = buildFilter(patientId, caseId);
  const skip = (Number(page) - 1) * Number(limit);
  const docs = await Model.find(query).sort(sort).skip(skip).limit(Number(limit)).lean();
  const total = await Model.countDocuments(query);
  return { docs, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 };
}

async function createEntry(Model, payload, actor, resourceType) {
  const clean = { ...payload };
  if (clean.patientId) clean.patientId = clean.patientId;
  const item = await Model.create({
    ...clean,
    createdBy: actor || 'system',
    updatedBy: actor || 'system',
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor || 'system',
    action: 'create',
    resourceType,
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { id: String(item._id) }
  });

  return item;
}

async function updateEntry(Model, id, payload, actor, resourceType) {
  const item = await Model.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...payload, updatedBy: actor || 'system', updatedAt: new Date() },
    { new: true }
  );

  if (item) {
    await logAudit({
      userId: actor || 'system',
      action: 'update',
      resourceType,
      resourceId: item._id,
      patientId: item.patientId,
      caseId: item.caseId,
      details: { id: String(item._id), fields: Object.keys(payload || {}) }
    });
  }

  return item;
}

async function deleteEntry(Model, id, actor, resourceType) {
  const item = await Model.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), updatedBy: actor || 'system', updatedAt: new Date() },
    { new: true }
  );

  if (item) {
    await logAudit({
      userId: actor || 'system',
      action: 'delete',
      resourceType,
      resourceId: item._id,
      patientId: item.patientId,
      caseId: item.caseId,
      details: { id: String(item._id) }
    });
  }

  return item;
}

async function createSymptom(payload, actor = 'system') {
  validateDateRange(payload.startDate || payload.onsetDate, payload.endDate, 'Symptom dates');
  return createEntry(Symptom, payload, actor, 'symptom');
}

async function listSymptoms(patientId, caseId = null, options = {}) {
  return listResource(Symptom, patientId, caseId, options);
}

async function getSymptomById(id) {
  return Symptom.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateSymptom(id, payload, actor = 'system') {
  validateDateRange(payload.startDate || payload.onsetDate, payload.endDate, 'Symptom dates');
  return updateEntry(Symptom, id, payload, actor, 'symptom');
}

async function deleteSymptom(id, actor = 'system') {
  return deleteEntry(Symptom, id, actor, 'symptom');
}

async function createTreatmentHistory(payload, actor = 'system') {
  validateDateRange(payload.startDate, payload.endDate, 'Treatment dates');
  return createEntry(TreatmentHistory, payload, actor, 'treatment_history');
}

async function listTreatmentHistory(patientId, caseId = null, options = {}) {
  return listResource(TreatmentHistory, patientId, caseId, options);
}

async function getTreatmentHistoryById(id) {
  return TreatmentHistory.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateTreatmentHistory(id, payload, actor = 'system') {
  validateDateRange(payload.startDate, payload.endDate, 'Treatment dates');
  return updateEntry(TreatmentHistory, id, payload, actor, 'treatment_history');
}

async function deleteTreatmentHistory(id, actor = 'system') {
  return deleteEntry(TreatmentHistory, id, actor, 'treatment_history');
}

async function createMedication(payload, actor = 'system') {
  validateDateRange(payload.startDate, payload.endDate, 'Medication dates');
  return createEntry(MedicationHistory, payload, actor, 'medication_history');
}

async function listMedications(patientId, caseId = null, options = {}) {
  return listResource(MedicationHistory, patientId, caseId, options);
}

async function getMedicationById(id) {
  return MedicationHistory.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateMedication(id, payload, actor = 'system') {
  validateDateRange(payload.startDate, payload.endDate, 'Medication dates');
  return updateEntry(MedicationHistory, id, payload, actor, 'medication_history');
}

async function deleteMedication(id, actor = 'system') {
  return deleteEntry(MedicationHistory, id, actor, 'medication_history');
}

async function createAllergy(payload, actor = 'system') {
  validateDateRange(payload.onsetDate, null, 'Allergy onset');
  return createEntry(Allergy, payload, actor, 'allergy');
}

async function listAllergies(patientId, caseId = null, options = {}) {
  return listResource(Allergy, patientId, caseId, options);
}

async function getAllergyById(id) {
  return Allergy.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateAllergy(id, payload, actor = 'system') {
  validateDateRange(payload.onsetDate, null, 'Allergy onset');
  return updateEntry(Allergy, id, payload, actor, 'allergy');
}

async function deleteAllergy(id, actor = 'system') {
  return deleteEntry(Allergy, id, actor, 'allergy');
}

async function createComorbidity(payload, actor = 'system') {
  validateDateRange(payload.onsetDate, null, 'Comorbidity onset');
  return createEntry(Comorbidity, payload, actor, 'comorbidity');
}

async function listComorbidities(patientId, caseId = null, options = {}) {
  return listResource(Comorbidity, patientId, caseId, options);
}

async function getComorbidityById(id) {
  return Comorbidity.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateComorbidity(id, payload, actor = 'system') {
  validateDateRange(payload.onsetDate, null, 'Comorbidity onset');
  return updateEntry(Comorbidity, id, payload, actor, 'comorbidity');
}

async function deleteComorbidity(id, actor = 'system') {
  return deleteEntry(Comorbidity, id, actor, 'comorbidity');
}

async function getPatientHistorySummary(patientId, caseId = null, actor = 'system') {
  const [symptoms, treatments, medications, allergies, comorbidities] = await Promise.all([
    Symptom.find(buildFilter(patientId, caseId)).sort({ createdAt: -1 }).lean(),
    TreatmentHistory.find(buildFilter(patientId, caseId)).sort({ createdAt: -1 }).lean(),
    MedicationHistory.find(buildFilter(patientId, caseId)).sort({ createdAt: -1 }).lean(),
    Allergy.find(buildFilter(patientId, caseId)).sort({ createdAt: -1 }).lean(),
    Comorbidity.find(buildFilter(patientId, caseId)).sort({ createdAt: -1 }).lean()
  ]);

  await logAudit({
    userId: actor || 'system',
    action: 'read',
    resourceType: 'patient_history_summary',
    resourceId: patientId,
    patientId,
    caseId,
    details: { summary: { symptoms: symptoms.length, treatments: treatments.length, medications: medications.length, allergies: allergies.length, comorbidities: comorbidities.length } }
  });

  return { symptoms, treatments, medications, allergies, comorbidities };
}

module.exports = {
  createSymptom,
  listSymptoms,
  getSymptomById,
  updateSymptom,
  deleteSymptom,
  createTreatmentHistory,
  listTreatmentHistory,
  getTreatmentHistoryById,
  updateTreatmentHistory,
  deleteTreatmentHistory,
  createMedication,
  listMedications,
  getMedicationById,
  updateMedication,
  deleteMedication,
  createAllergy,
  listAllergies,
  getAllergyById,
  updateAllergy,
  deleteAllergy,
  createComorbidity,
  listComorbidities,
  getComorbidityById,
  updateComorbidity,
  deleteComorbidity,
  getPatientHistorySummary
};
