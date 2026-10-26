const CareCase = require('../models/Case');
const Patient = require('../models/Patient');
const TreatmentPlan = require('../models/TreatmentPlan');
const ProgressScore = require('../models/ProgressScore');
const Alert = require('../models/Alert');
const User = require('../models/User');
const CaseTimelineEvent = require('../models/CaseTimelineEvent');

function toTimelineItem(type, source, eventDate, title, description = '') {
  return {
    _id: source?._id || `${type}-${Date.now()}`,
    type,
    title,
    description,
    eventDate: eventDate || source?.createdAt || new Date(),
    source
  };
}

async function getPatientDashboardSummary(patientId, actor = 'system') {
  const patient = await Patient.findOne({ _id: patientId, isDeleted: false }).lean();
  if (!patient) {
    const err = new Error('Patient not found');
    err.statusCode = 404;
    throw err;
  }

  const [cases, plans, alerts, progressScores, timelineEvents] = await Promise.all([
    CareCase.find({ patientId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    TreatmentPlan.find({ patientId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    Alert.find({ patientId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    ProgressScore.find({ patientId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    CaseTimelineEvent.find({ patientId, isDeleted: false }).sort({ eventDate: -1 }).lean()
  ]);

  const timeline = [
    ...timelineEvents.map((event) => ({
      _id: event._id,
      type: event.type,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      source: event
    })),
    ...plans.map((plan) => toTimelineItem('plan', plan, plan.createdAt || new Date(), `Plan ${plan.status || 'draft'}`, plan.target || plan.therapy || 'Treatment plan')),
    ...alerts.map((alert) => toTimelineItem('alert', alert, alert.createdAt || new Date(), alert.title, alert.message)),
    ...progressScores.map((score) => toTimelineItem('progress', score, score.createdAt || new Date(), `Progress score ${score.score}`, score.category || 'Mobility'))
  ].sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate)).slice(0, 20);

  const summary = {
    totalCases: cases.length,
    totalPlans: plans.length,
    totalAlerts: alerts.length,
    openAlerts: alerts.filter((alert) => alert.status === 'open').length,
    latestProgressScore: progressScores.length ? progressScores[0].score : null,
    activePlans: plans.filter((plan) => ['approved', 'under_review', 'in_treatment', 'active'].includes(plan.status)).length,
    latestCaseStatus: cases.length ? cases[0].status : null
  };

  return {
    patient,
    cases,
    plans,
    alerts,
    progressScores,
    timeline,
    summary
  };
}

async function getClinicianDashboardSummary(clinicianId, actor = 'system') {
  const clinician = await User.findOne({ _id: clinicianId, isDeleted: false }).lean();
  if (!clinician) {
    const err = new Error('Clinician not found');
    err.statusCode = 404;
    throw err;
  }

  const caseIds = (clinician.assignedCaseIds || []).map((id) => id.toString());
  const patientIds = (clinician.assignedPatientIds || []).map((id) => id.toString());

  const cases = await CareCase.find({
    $or: [
      { _id: { $in: caseIds } },
      { patientId: { $in: patientIds } }
    ],
    isDeleted: false
  }).sort({ createdAt: -1 }).lean();

  const patientIdsFromCases = [...new Set(cases.map((item) => item.patientId.toString()))];
  const [plans, alerts, progressScores] = await Promise.all([
    TreatmentPlan.find({ patientId: { $in: patientIdsFromCases }, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    Alert.find({ patientId: { $in: patientIdsFromCases }, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    ProgressScore.find({ patientId: { $in: patientIdsFromCases }, isDeleted: false }).sort({ createdAt: -1 }).lean()
  ]);

  return {
    clinician: {
      _id: clinician._id,
      name: clinician.name,
      role: clinician.role,
      tenantId: clinician.tenantId
    },
    summary: {
      totalCases: cases.length,
      totalPlans: plans.length,
      totalAlerts: alerts.length,
      totalProgressScores: progressScores.length,
      activeCases: cases.filter((item) => ['accepted', 'in_treatment', 'monitoring'].includes(item.status)).length
    },
    cases,
    plans,
    alerts,
    progressScores
  };
}

async function getCaseOverview(caseId) {
  const careCase = await CareCase.findOne({ _id: caseId, isDeleted: false }).lean();
  if (!careCase) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }

  const [patient, plans, alerts, progressScores, timelineEvents] = await Promise.all([
    Patient.findOne({ _id: careCase.patientId, isDeleted: false }).lean(),
    TreatmentPlan.find({ caseId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    Alert.find({ caseId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    ProgressScore.find({ caseId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    CaseTimelineEvent.find({ caseId, isDeleted: false }).sort({ eventDate: -1 }).lean()
  ]);

  const timeline = [
    ...timelineEvents.map((event) => ({
      _id: event._id,
      type: event.type,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate
    })),
    ...plans.map((plan) => ({
      _id: plan._id,
      type: 'plan',
      title: `Plan ${plan.status || 'draft'}`,
      description: plan.target || plan.therapy || 'Treatment plan',
      eventDate: plan.createdAt || new Date()
    })),
    ...alerts.map((alert) => ({
      _id: alert._id,
      type: 'alert',
      title: alert.title,
      description: alert.message,
      eventDate: alert.createdAt || new Date()
    })),
    ...progressScores.map((score) => ({
      _id: score._id,
      type: 'progress',
      title: `Progress score ${score.score}`,
      description: score.category || 'Case monitoring score',
      eventDate: score.createdAt || new Date()
    }))
  ].sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  return {
    caseId: careCase._id,
    case: careCase,
    patient,
    plans,
    alerts,
    progressScores,
    timeline,
    summary: {
      totalPlans: plans.length,
      totalAlerts: alerts.length,
      totalProgressScores: progressScores.length,
      hasActivePlan: plans.some((plan) => ['approved', 'under_review', 'active'].includes(plan.status)),
      latestStatus: careCase.status || null,
      latestProgressScore: progressScores.length ? progressScores[0].score : null
    }
  };
}

module.exports = {
  getPatientDashboardSummary,
  getClinicianDashboardSummary,
  getCaseOverview
};
