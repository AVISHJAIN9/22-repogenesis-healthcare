const MonitoringPlan = require('../models/MonitoringPlan');
const FollowUp = require('../models/FollowUp');
const SafetyWarning = require('../models/SafetyWarning');
const Milestone = require('../models/Milestone');
const Questionnaire = require('../models/Questionnaire');
const QuestionnaireResponse = require('../models/QuestionnaireResponse');
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

async function createMonitoringPlan(payload, actor = 'system') {
  const item = await MonitoringPlan.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'monitoring_plan',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { planName: item.planName }
  });

  return item;
}

async function createFollowUp(payload, actor = 'system') {
  const item = await FollowUp.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'follow_up',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { type: item.type, status: item.status }
  });

  return item;
}

async function createSafetyWarning(payload, actor = 'system') {
  const item = await SafetyWarning.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'safety_warning',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { severity: item.severity, status: item.status }
  });

  return item;
}

async function createMilestone(payload, actor = 'system') {
  const item = await Milestone.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'milestone',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { title: item.title, status: item.status }
  });

  return item;
}

async function createQuestionnaire(payload, actor = 'system') {
  const item = await Questionnaire.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  return item;
}

async function submitQuestionnaireResponse(payload, actor = 'system') {
  const item = await QuestionnaireResponse.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  return item;
}

async function getMonitoringSummary(patientId, caseId = null, actor = 'system') {
  const filter = { patientId, isDeleted: false };
  if (caseId) filter.caseId = caseId;

  const [plans, followUps, warnings, milestones, questionnaires] = await Promise.all([
    MonitoringPlan.find(filter).sort({ createdAt: -1 }).lean(),
    FollowUp.find(filter).sort({ createdAt: -1 }).lean(),
    SafetyWarning.find(filter).sort({ createdAt: -1 }).lean(),
    Milestone.find(filter).sort({ createdAt: -1 }).lean(),
    Questionnaire.find(filter).sort({ createdAt: -1 }).lean()
  ]);

  const summary = {
    totalMonitoringPlans: plans.length,
    totalFollowUps: followUps.length,
    totalWarnings: warnings.length,
    totalMilestones: milestones.length,
    totalQuestionnaires: questionnaires.length,
    activeWarnings: warnings.filter((warning) => warning.status === 'active').length,
    scheduledFollowUps: followUps.filter((followUp) => followUp.status === 'scheduled').length
  };

  await logAudit({
    userId: actor,
    action: 'read',
    resourceType: 'monitoring_summary',
    resourceId: patientId,
    patientId,
    caseId,
    details: { summary }
  });

  return { plans, followUps, warnings, milestones, questionnaires, summary };
}

module.exports = {
  createMonitoringPlan,
  createFollowUp,
  createSafetyWarning,
  createMilestone,
  createQuestionnaire,
  submitQuestionnaireResponse,
  getMonitoringSummary
};
