const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const CareCase = require('../models/Case');
const TreatmentPlan = require('../models/TreatmentPlan');
const EligibilityCriteria = require('../models/EligibilityCriteria');
const EligibilityResult = require('../models/EligibilityResult');
const RiskBenefitEntry = require('../models/RiskBenefitEntry');
const ExpectedOutcome = require('../models/ExpectedOutcome');
const Override = require('../models/Override');
const DecisionRationale = require('../models/DecisionRationale');
const { evaluateContraindications } = require('./planService');

function buildHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function getAgeYears(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  const ageMs = Date.now() - birthDate.getTime();
  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25)));
}

function buildRiskBenefit(therapy) {
  const therapyName = String(therapy || 'Standard care').trim() || 'Standard care';
  const isCellTherapy = /msc|stem cell|regenerative/i.test(therapyName);
  const isInjectionTherapy = /prp|platelet/i.test(therapyName);

  const risks = [
    'Transient discomfort at treatment site',
    'Need for close follow-up during the first 2-4 weeks'
  ];
  const benefits = [
    'Improved function over a structured treatment timeline',
    'Targeted clinical follow-up before and after intervention'
  ];

  if (isCellTherapy) {
    risks.push('Additional assessment required for immunologic or procedural risk');
    benefits.push('Potential for durable improvement when aligned with patient suitability');
  }

  if (isInjectionTherapy) {
    risks.push('Localized swelling or soreness following the procedure');
    benefits.push('Minimally invasive treatment pathway with shorter downtime');
  }

  const riskScore = isCellTherapy ? 62 : isInjectionTherapy ? 48 : 36;
  const benefitScore = isCellTherapy ? 78 : isInjectionTherapy ? 72 : 60;
  const riskLevel = riskScore >= 65 ? 'high' : riskScore >= 45 ? 'moderate' : 'low';
  const benefitLevel = benefitScore >= 75 ? 'high' : benefitScore >= 60 ? 'moderate' : 'low';

  return {
    therapy: therapyName,
    riskLevel,
    benefitLevel,
    riskScore,
    benefitScore,
    risks: Array.from(new Set(risks)),
    benefits: Array.from(new Set(benefits)),
    summary: `${therapyName} presents a ${riskLevel} procedural risk profile and a ${benefitLevel} expected benefit profile when used within an approved care plan.`
  };
}

function buildExpectedOutcomes(therapy) {
  const therapyName = String(therapy || 'Standard care').trim() || 'Standard care';
  const base = [
    {
      label: 'Symptom reduction',
      metric: 'Pain or function score',
      target: 'Improved by 20-30%',
      probability: 78,
      timelineDays: 30,
      rationale: 'Structured follow-up and rehabilitation are expected to improve function within the first month.'
    },
    {
      label: 'Recovery trajectory',
      metric: 'Mobility or activity level',
      target: 'Progress toward baseline function',
      probability: 72,
      timelineDays: 60,
      rationale: 'The planned intervention and monitoring cadence are designed to support gradual restoration.'
    }
  ];

  if (/msc|stem cell|regenerative/i.test(therapyName)) {
    base.push({
      label: 'Cell-therapy suitability',
      metric: 'Clinical review completion',
      target: 'Approval with documented monitoring plan',
      probability: 85,
      timelineDays: 14,
      rationale: 'Therapy approval depends on documented review and baseline stability.'
    });
  }

  return base.map((item) => ({
    ...item,
    therapy: therapyName,
    target: item.target || 'Documented clinical improvement'
  }));
}

async function evaluateDecisionSupport({ patientId, caseId, planId, therapy, tenantId = 'default', createdBy = null }) {
  if (!patientId || !caseId) {
    throw buildHttpError(400, 'patientId and caseId are required');
  }

  const patient = await Patient.findOne({ _id: patientId, tenantId, isDeleted: false }).lean();
  if (!patient) throw buildHttpError(404, 'Patient not found');

  const careCase = await CareCase.findOne({ _id: caseId, patientId, tenantId, isDeleted: false }).lean();
  if (!careCase) throw buildHttpError(404, 'Case not found for this patient');

  const plan = planId ? await TreatmentPlan.findOne({ _id: planId, tenantId, isDeleted: false }).lean() : null;
  const therapyName = String(therapy || plan?.therapy || 'Standard care').trim() || 'Standard care';
  const ageYears = getAgeYears(patient.dateOfBirth);
  const contraindications = await evaluateContraindications({ patientId, caseId, therapy: therapyName, tenantId });
  const blocking = contraindications.filter((item) => item.severity === 'hard');

  const checks = [];
  const addCheck = (field, description, passed, detail) => {
    checks.push({ field, description, passed, detail });
  };

  addCheck('consent', 'Patient consent for treatment is recorded', !!patient.consentForTreatment, patient.consentForTreatment ? 'Consent is present.' : 'Consent must be recorded before treatment approval.');
  addCheck('case_status', 'Case remains active for clinical review', !['completed', 'closed'].includes(careCase.status), `Case status: ${careCase.status}`);
  addCheck('therapy', 'Therapy name is documented', !!therapyName, 'Therapy is required to evaluate the plan.');
  addCheck('age', 'Patient age falls within a typical treatment review window', ageYears === null || (ageYears >= 18 && ageYears <= 80), ageYears === null ? 'Age is not available.' : `Age reported as ${ageYears} years.`);
  addCheck('goal', 'Clinical goal or treatment target is defined', !!(careCase.treatmentGoal || plan?.target || plan?.objective), 'A treatment goal is needed for decision support.');
  addCheck('contraindication', 'No hard contraindications are present', blocking.length === 0, blocking.length ? blocking.map((item) => item.message).join('; ') : 'No hard contraindication found.');

  const eligible = checks.every((item) => item.passed);
  const riskBenefit = buildRiskBenefit(therapyName);
  const expectedOutcomes = buildExpectedOutcomes(therapyName);
  const rationale = eligible
    ? `The plan for ${therapyName} is clinically eligible under the current review checklist and does not trigger any hard contraindications.`
    : `The plan for ${therapyName} is not eligible because one or more required checks failed or a hard contraindication was identified.`;

  const eligibilityRecord = await EligibilityResult.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    therapy: therapyName,
    eligible,
    status: eligible ? 'eligible' : 'ineligible',
    rationale,
    checks,
    contraindications: blocking.length ? blocking.map((item) => ({
      ruleName: item.ruleName || 'contraindication',
      severity: item.severity,
      message: item.message,
      recommendation: item.recommendation || 'Escalate to clinician review.'
    })) : [],
    createdBy: createdBy || null
  });

  await EligibilityCriteria.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    therapy: therapyName,
    checks,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const riskRecord = await RiskBenefitEntry.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    therapy: therapyName,
    riskLevel: riskBenefit.riskLevel,
    benefitLevel: riskBenefit.benefitLevel,
    riskScore: riskBenefit.riskScore,
    benefitScore: riskBenefit.benefitScore,
    risks: riskBenefit.risks,
    benefits: riskBenefit.benefits,
    summary: riskBenefit.summary
  });

  await Promise.all(expectedOutcomes.map((outcome) => ExpectedOutcome.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    therapy: therapyName,
    label: outcome.label,
    metric: outcome.metric,
    target: outcome.target,
    probability: outcome.probability,
    timelineDays: outcome.timelineDays,
    rationale: outcome.rationale
  })));

  await DecisionRationale.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    therapy: therapyName,
    rationale,
    summary: riskBenefit.summary,
    overrideId: null
  });

  return {
    planId: planId || null,
    patientId,
    caseId,
    therapy: therapyName,
    eligible,
    status: eligible ? 'eligible' : 'ineligible',
    eligibilityChecks: checks,
    contraindications: blocking,
    riskBenefit: [{
      ...riskBenefit,
      entryId: riskRecord._id,
      risks: riskBenefit.risks,
      benefits: riskBenefit.benefits
    }],
    expectedOutcomes,
    rationale,
    resultId: eligibilityRecord._id
  };
}

async function createOverride({ planId, patientId, caseId, clinicianId, overrideType = 'clinical_exception', reason, notes, tenantId = 'default' }) {
  if (!planId && (!patientId || !caseId)) {
    throw buildHttpError(400, 'planId or patientId/caseId are required');
  }

  const plan = planId ? await TreatmentPlan.findOne({ _id: planId, tenantId, isDeleted: false }).lean() : null;
  if (planId && !plan) throw buildHttpError(404, 'Plan not found');

  const patient = patientId ? await Patient.findOne({ _id: patientId, tenantId, isDeleted: false }).lean() : null;
  const careCase = caseId ? await CareCase.findOne({ _id: caseId, tenantId, isDeleted: false }).lean() : null;

  if (!patient || !careCase) {
    throw buildHttpError(404, 'Patient or case not found');
  }

  if (!reason || !String(reason).trim()) {
    throw buildHttpError(400, 'A clinician override reason is required');
  }

  const overrideRecord = await Override.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    clinicianId: clinicianId || null,
    overrideType,
    reason: String(reason).trim(),
    notes: String(notes || '').trim(),
    approvedAt: new Date()
  });

  const rationaleText = `Override recorded for ${plan?.therapy || 'the current treatment plan'}: ${String(reason).trim()}. ${String(notes || '').trim()}`;

  const rationaleDoc = await DecisionRationale.create({
    tenantId,
    patientId,
    caseId,
    planId: planId || null,
    therapy: plan?.therapy || 'Standard care',
    rationale: rationaleText,
    summary: rationaleText,
    overrideId: overrideRecord._id
  });

  return {
    _id: overrideRecord._id,
    patientId,
    caseId,
    planId: planId || null,
    clinicianId: clinicianId || null,
    overrideType,
    reason: String(reason).trim(),
    notes: String(notes || '').trim(),
    rationaleId: rationaleDoc._id,
    approvedAt: overrideRecord.approvedAt
  };
}

async function getDecisionSupportSummary(planId, tenantId = 'default') {
  if (!planId) {
    throw buildHttpError(400, 'planId is required');
  }

  const plan = await TreatmentPlan.findOne({ _id: planId, tenantId, isDeleted: false }).lean();
  if (!plan) throw buildHttpError(404, 'Plan not found');

  const latestEligibility = await EligibilityResult.findOne({ planId, tenantId }).sort({ createdAt: -1 }).lean();
  const latestRisk = await RiskBenefitEntry.findOne({ planId, tenantId }).sort({ createdAt: -1 }).lean();
  const expectedOutcomes = await ExpectedOutcome.find({ planId, tenantId }).sort({ createdAt: 1 }).lean();
  const latestOverride = await Override.findOne({ planId, tenantId }).sort({ createdAt: -1 }).lean();

  if (latestEligibility || latestRisk || expectedOutcomes.length || latestOverride) {
    return {
      planId,
      therapy: plan.therapy,
      eligible: latestEligibility?.eligible ?? true,
      status: latestEligibility?.status || 'eligible',
      eligibilityChecks: latestEligibility?.checks || [],
      riskBenefit: latestRisk ? [{
        riskLevel: latestRisk.riskLevel,
        benefitLevel: latestRisk.benefitLevel,
        riskScore: latestRisk.riskScore,
        benefitScore: latestRisk.benefitScore,
        risks: latestRisk.risks,
        benefits: latestRisk.benefits,
        summary: latestRisk.summary
      }] : [],
      expectedOutcomes: expectedOutcomes.map((item) => ({
        label: item.label,
        metric: item.metric,
        target: item.target,
        probability: item.probability,
        timelineDays: item.timelineDays,
        rationale: item.rationale
      })),
      override: latestOverride ? {
        overrideType: latestOverride.overrideType,
        reason: latestOverride.reason,
        notes: latestOverride.notes,
        approvedAt: latestOverride.approvedAt
      } : null,
      rationale: latestEligibility?.rationale || 'Decision support summary is available.'
    };
  }

  return evaluateDecisionSupport({ patientId: plan.patientId, caseId: plan.caseId, planId, therapy: plan.therapy, tenantId });
}

module.exports = {
  evaluateDecisionSupport,
  createOverride,
  getDecisionSupportSummary,
  buildRiskBenefit,
  buildExpectedOutcomes
};
