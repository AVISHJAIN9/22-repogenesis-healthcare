const PatientReportedOutcome = require('../models/PatientReportedOutcome');
const ClinicalOutcome = require('../models/ClinicalOutcome');
const ImagingFollowUp = require('../models/ImagingFollowUp');
const BiomarkerFollowUp = require('../models/BiomarkerFollowUp');
const AdverseEvent = require('../models/AdverseEvent');
const AuditLog = require('../models/AuditLog');

async function logAudit({ userId, action, resourceType, resourceId, patientId, caseId, details = {} }) {
  await AuditLog.create({
    userId: userId || 'system',
    action,
    resourceType,
    resourceId: String(resourceId),
    patientId,
    caseId,
    details: { ...details, redacted: true }
  });
}

async function createPatientReportedOutcome(payload, actor = 'system') {
  const item = await PatientReportedOutcome.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'patient_reported_outcome',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { instrument: item.instrument, score: item.score }
  });

  return item;
}

async function createClinicalOutcome(payload, actor = 'system') {
  const item = await ClinicalOutcome.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'clinical_outcome',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { outcomeType: item.outcomeType, value: item.value }
  });

  return item;
}

async function createImagingFollowUp(payload, actor = 'system') {
  const item = await ImagingFollowUp.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'imaging_follow_up',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { studyType: item.studyType, comparedToBaseline: item.comparedToBaseline }
  });

  return item;
}

async function createBiomarkerFollowUp(payload, actor = 'system') {
  const item = await BiomarkerFollowUp.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'biomarker_follow_up',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { markerName: item.markerName, value: item.value }
  });

  return item;
}

async function createAdverseEvent(payload, actor = 'system') {
  const item = await AdverseEvent.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'adverse_event',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { eventType: item.eventType, severity: item.severity }
  });

  return item;
}

async function getPatientOutcomeSummary(patientId, caseId = null, actor = 'system') {
  const filter = { patientId, isDeleted: false };
  if (caseId) filter.caseId = caseId;

  const [pros, clinicalOutcomes, imagingFollowUps, biomarkerFollowUps, adverseEvents] = await Promise.all([
    PatientReportedOutcome.find(filter).sort({ createdAt: -1 }).lean(),
    ClinicalOutcome.find(filter).sort({ createdAt: -1 }).lean(),
    ImagingFollowUp.find(filter).sort({ createdAt: -1 }).lean(),
    BiomarkerFollowUp.find(filter).sort({ createdAt: -1 }).lean(),
    AdverseEvent.find(filter).sort({ createdAt: -1 }).lean()
  ]);

  const summary = {
    totalPros: pros.length,
    totalClinicalOutcomes: clinicalOutcomes.length,
    totalImagingFollowUps: imagingFollowUps.length,
    totalBiomarkerFollowUps: biomarkerFollowUps.length,
    totalAdverseEvents: adverseEvents.length,
    severeAdverseEvents: adverseEvents.filter((event) => ['severe', 'critical'].includes(event.severity)).length
  };

  await logAudit({
    userId: actor,
    action: 'read',
    resourceType: 'outcome_summary',
    resourceId: patientId,
    patientId,
    caseId,
    details: { summary }
  });

  return { pros, clinicalOutcomes, imagingFollowUps, biomarkerFollowUps, adverseEvents, summary };
}

module.exports = {
  createPatientReportedOutcome,
  createClinicalOutcome,
  createImagingFollowUp,
  createBiomarkerFollowUp,
  createAdverseEvent,
  getPatientOutcomeSummary
};
