const mongoose = require('mongoose');
const TreatmentPlan = require('../models/TreatmentPlan');
const PlanVersion = require('../models/PlanVersion');
const ContraindicationRule = require('../models/ContraindicationRule');
const Patient = require('../models/Patient');
const CareCase = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const Allergy = require('../models/Allergy');
const Comorbidity = require('../models/Comorbidity');
const MedicationHistory = require('../models/MedicationHistory');
const MedicalHistory = require('../models/MedicalHistory');

function buildHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function normalizePlanComponent(component = {}, order = 0) {
  return {
    name: component.name || `Component ${order + 1}`,
    type: component.type || 'therapy',
    dose: component.dose || '',
    schedule: component.schedule || '',
    notes: component.notes || '',
    order: Number(component.order ?? order)
  };
}

function normalizeTimelineItem(item = {}, index = 0) {
  return {
    phase: item.phase || `Phase ${index + 1}`,
    startOffsetDays: Number(item.startOffsetDays ?? index * 7),
    durationDays: Number(item.durationDays ?? 7),
    dependencies: safeArray(item.dependencies || []),
    scheduledDate: item.scheduledDate || null
  };
}

function generateDefaultTimeline(components = []) {
  if (Array.isArray(components) && components.length > 0) {
    return components.map((component, index) => ({
      phase: component.name || `Phase ${index + 1}`,
      startOffsetDays: index * 14,
      durationDays: 14,
      dependencies: index === 0 ? [] : [components[index - 1].name || `Phase ${index}`],
      scheduledDate: null
    }));
  }

  return [
    { phase: 'Assessment', startOffsetDays: 0, durationDays: 7, dependencies: [], scheduledDate: null },
    { phase: 'Intervention', startOffsetDays: 7, durationDays: 21, dependencies: ['Assessment'], scheduledDate: null },
    { phase: 'Follow-up', startOffsetDays: 28, durationDays: 30, dependencies: ['Intervention'], scheduledDate: null }
  ];
}

async function ensurePatientCaseScope(patientId, caseId, tenantId) {
  if (!patientId || !caseId) {
    throw buildHttpError(400, 'patientId and caseId are required');
  }

  const patient = await Patient.findOne({ _id: patientId, isDeleted: false }).lean();
  if (!patient) throw buildHttpError(404, 'Patient not found');
  if (patient.tenantId !== tenantId) throw buildHttpError(403, 'Forbidden: cross-tenant plan access is not allowed');
  if (!patient.consentForTreatment) throw buildHttpError(400, 'Patient consent for treatment is required before a treatment plan can be created or approved');

  const careCase = await CareCase.findOne({ _id: caseId, patientId, isDeleted: false }).lean();
  if (!careCase) throw buildHttpError(404, 'Case not found for this patient');
  if (careCase.tenantId !== tenantId) throw buildHttpError(403, 'Forbidden: case belongs to a different tenant');

  return { patient, careCase };
}

async function createPlanVersion(plan, actor = 'system') {
  return PlanVersion.create({
    tenantId: plan.tenantId,
    planId: plan._id,
    patientId: plan.patientId,
    caseId: plan.caseId,
    version: plan.version,
    target: plan.target,
    objective: plan.objective,
    therapy: plan.therapy,
    components: plan.components,
    timeline: plan.timeline,
    status: plan.status,
    notes: plan.notes,
    createdAt: new Date(),
    isDeleted: false
  });
}

async function logPlanAudit({ userId, action, resourceType, resourceId, patientId, caseId, details = {} }) {
  await AuditLog.create({
    tenantId: 'default',
    userId: userId || 'system',
    userRole: 'clinician',
    action,
    resourceType,
    resourceId: String(resourceId),
    patientId,
    caseId,
    details: { ...details, redacted: true }
  });
}

async function createTreatmentPlan(data, actor = 'system') {
  const tenantId = data.tenantId || 'default';
  const patientId = data.patientId;
  const caseId = data.caseId;
  await ensurePatientCaseScope(patientId, caseId, tenantId);

  const payload = {
    ...data,
    tenantId,
    components: (data.components || []).map((item, index) => normalizePlanComponent(item, index)),
    timeline: (data.timeline && data.timeline.length ? data.timeline : generateDefaultTimeline(data.components || [])).map((item, index) => normalizeTimelineItem(item, index)),
    version: Number(data.version || 1),
    status: data.status || 'draft',
    target: String(data.target || '').trim(),
    objective: String(data.objective || '').trim(),
    therapy: String(data.therapy || '').trim(),
    notes: String(data.notes || '').trim(),
    createdBy: actor,
    updatedBy: actor,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null
  };

  if (!payload.target || !payload.objective || !payload.therapy) {
    throw buildHttpError(400, 'target, objective, and therapy are required');
  }

  if (payload.status === 'approved') {
    const contraindications = await evaluateContraindications({ patientId, caseId, therapy: payload.therapy, tenantId });
    const blocking = contraindications.filter((item) => item.severity === 'hard');
    if (blocking.length) {
      throw buildHttpError(400, `Plan cannot be approved because of hard contraindications: ${blocking.map((item) => item.message).join('; ')}`);
    }
  }

  const plan = await TreatmentPlan.create({ ...payload, updatedAt: new Date() });
  await createPlanVersion(plan, actor);

  await logPlanAudit({
    userId: actor,
    action: 'create',
    resourceType: 'treatment_plan',
    resourceId: plan._id,
    patientId: plan.patientId,
    caseId: plan.caseId,
    details: { target: plan.target, status: plan.status }
  });

  return plan;
}

async function findPlans(filter = {}, options = {}) {
  const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
  const query = { isDeleted: false, ...(filter || {}) };
  const skip = (Number(page) - 1) * Number(limit);
  const docs = await TreatmentPlan.find(query).sort(sort).skip(skip).limit(Number(limit)).lean();
  const total = await TreatmentPlan.countDocuments(query);
  return { docs, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 };
}

async function getPlanById(id) {
  return TreatmentPlan.findOne({ _id: id, isDeleted: false }).lean();
}

async function updatePlanStatus(id, status, actor = 'system', tenantId = 'default') {
  const item = await TreatmentPlan.findOne({ _id: id, tenantId, isDeleted: false });
  if (!item) throw buildHttpError(404, 'Treatment plan not found');

  if (status === 'approved') {
    const contraindications = await evaluateContraindications({ patientId: item.patientId, caseId: item.caseId, therapy: item.therapy, tenantId });
    const blocking = contraindications.filter((entry) => entry.severity === 'hard');
    if (blocking.length) {
      throw buildHttpError(400, `Plan cannot be approved because of hard contraindications: ${blocking.map((entry) => entry.message).join('; ')}`);
    }
  }

  item.status = status;
  item.updatedBy = actor;
  item.updatedAt = new Date();
  if (status === 'approved') item.approvedAt = new Date();
  await item.save();

  await logPlanAudit({
    userId: actor,
    action: 'update',
    resourceType: 'treatment_plan',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { status }
  });

  return item;
}

async function listProtocolRecommendations({ patientId, caseId, therapy, tenantId = 'default' }) {
  const rules = await ContraindicationRule.find({ tenantId, active: true, isDeleted: false }).lean();
  const relevant = rules.filter((rule) => {
    if (!rule.therapy) return true;
    if (!therapy) return true;
    return rule.therapy.toLowerCase() === String(therapy).toLowerCase();
  });

  return relevant.map((rule) => ({
    ruleId: rule._id,
    name: rule.name,
    category: rule.category,
    severity: rule.severity,
    message: rule.message,
    recommendation: rule.recommendation || 'Review with clinical team.',
    therapy: rule.therapy || therapy || 'general',
    why: rule.message,
    patientId,
    caseId
  }));
}

async function evaluateContraindications({ patientId, caseId, therapy, tenantId = 'default' }) {
  const rules = await ContraindicationRule.find({ tenantId, active: true, isDeleted: false }).lean();
  const patient = await Patient.findOne({ _id: patientId, isDeleted: false }).lean();
  const allergies = await Allergy.find({ patientId, isDeleted: false }).lean();
  const comorbidities = await Comorbidity.find({ patientId, isDeleted: false }).lean();
  const medications = await MedicationHistory.find({ patientId, isDeleted: false }).lean();
  const medicalHistory = await MedicalHistory.find({ patientId, isDeleted: false }).lean();

  const findings = [];
  for (const rule of rules) {
    if (rule.therapy && therapy && rule.therapy.toLowerCase() !== String(therapy).toLowerCase()) continue;

    const matches = rule.conditions || [];
    let matched = true;
    let reason = rule.message;

    for (const condition of matches) {
      let actual = null;
      if (condition.field === 'allergy') {
        actual = allergies.map((item) => item.allergen || item.name || item.material).filter(Boolean);
      } else if (condition.field === 'comorbidity') {
        actual = comorbidities.map((item) => item.condition || item.name || item.type).filter(Boolean);
      } else if (condition.field === 'medication') {
        actual = medications.map((item) => item.drugName || item.name || item.medication).filter(Boolean);
      } else if (condition.field === 'medicalHistory') {
        actual = medicalHistory.map((item) => item.condition || item.diagnosisName).filter(Boolean);
      } else if (condition.field === 'therapy') {
        actual = therapy;
      } else {
        actual = patient?.[condition.field] ?? null;
      }

      const pass = evaluateCondition(actual, condition.operator, condition.value);
      if (!pass) {
        matched = false;
        break;
      }

      if (condition.field === 'allergy' && Array.isArray(actual)) {
        const triggered = actual.find((value) => String(value).toLowerCase() === String(condition.value).toLowerCase());
        if (triggered) reason = `${rule.name}: ${triggered} is listed as a contraindication.`;
      }
    }

    if (matched) {
      findings.push({
        ruleId: String(rule._id),
        ruleName: rule.name,
        severity: rule.severity,
        message: reason,
        recommendation: rule.recommendation || 'Review with clinical team before approval.',
        blocking: rule.severity === 'hard'
      });
    }
  }

  return findings;
}

function evaluateCondition(actualValue, operator, expectedValue) {
  const current = Array.isArray(actualValue) ? actualValue : [actualValue];
  const normalized = current.map((value) => (typeof value === 'string' ? value.toLowerCase() : value));
  const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : expectedValue;

  switch (operator) {
    case 'in':
      return normalized.some((value) => Array.isArray(expected) ? expected.some((item) => String(item).toLowerCase() === String(value).toLowerCase()) : String(value).toLowerCase() === String(expected).toLowerCase());
    case 'contains':
      return normalized.some((value) => String(value).toLowerCase().includes(String(expected).toLowerCase()));
    case 'eq':
      return normalized.some((value) => String(value).toLowerCase() === String(expected).toLowerCase());
    case 'gt':
      return normalized.some((value) => Number(value) > Number(expected));
    case 'gte':
      return normalized.some((value) => Number(value) >= Number(expected));
    case 'lt':
      return normalized.some((value) => Number(value) < Number(expected));
    case 'lte':
      return normalized.some((value) => Number(value) <= Number(expected));
    default:
      return true;
  }
}

async function comparePlans(planAId, planBId, tenantId = 'default') {
  const a = await TreatmentPlan.findOne({ _id: planAId, tenantId, isDeleted: false }).lean();
  const b = await TreatmentPlan.findOne({ _id: planBId, tenantId, isDeleted: false }).lean();

  if (!a || !b) throw buildHttpError(404, 'Both plans must exist in the same tenant');

  const fieldsToCompare = ['target', 'objective', 'therapy', 'status', 'version', 'notes'];
  const diff = [];

  for (const field of fieldsToCompare) {
    if (String(a[field] || '') !== String(b[field] || '')) {
      diff.push({ field, before: a[field], after: b[field] });
    }
  }

  if (JSON.stringify(a.components || []) !== JSON.stringify(b.components || [])) {
    diff.push({ field: 'components', before: a.components || [], after: b.components || [] });
  }

  if (JSON.stringify(a.timeline || []) !== JSON.stringify(b.timeline || [])) {
    diff.push({ field: 'timeline', before: a.timeline || [], after: b.timeline || [] });
  }

  return {
    planAId,
    planBId,
    diff,
    summary: {
      changedFields: diff.length,
      planAStatus: a.status,
      planBStatus: b.status,
      changedAt: new Date().toISOString()
    }
  };
}

async function buildPlanFromSelection(payload, actor = 'system') {
  const normalized = {
    tenantId: payload.tenantId || 'default',
    patientId: payload.patientId,
    caseId: payload.caseId,
    target: payload.target || 'Treatment target',
    objective: payload.objective || 'Improve clinical outcome',
    therapy: payload.therapy || 'Standard regenerative protocol',
    components: Array.isArray(payload.components) ? payload.components.map((component, index) => normalizePlanComponent(component, index)) : [],
    timeline: Array.isArray(payload.timeline) && payload.timeline.length ? payload.timeline.map((item, index) => normalizeTimelineItem(item, index)) : generateDefaultTimeline(Array.isArray(payload.components) ? payload.components : []),
    status: payload.status || 'draft',
    version: Number(payload.version || 1),
    notes: payload.notes || ''
  };

  return createTreatmentPlan(normalized, actor);
}

module.exports = {
  createTreatmentPlan,
  findPlans,
  getPlanById,
  updatePlanStatus,
  listProtocolRecommendations,
  evaluateContraindications,
  comparePlans,
  buildPlanFromSelection,
  generateDefaultTimeline,
  ensurePatientCaseScope
};
