const ProgressScore = require('../models/ProgressScore');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const { getTreatmentTrend } = require('./trendService');

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

async function createProgressScore(payload, actor = 'system') {
  const score = Number(payload.score ?? 0);
  const baselineScore = Number(payload.baselineScore ?? score);
  const delta = score - baselineScore;

  let status = 'stable';
  if (delta >= 10) status = 'improving';
  else if (delta <= -10) status = 'concern';

  const item = await ProgressScore.create({
    ...payload,
    score,
    baselineScore,
    delta,
    status,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'progress_score',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { score: item.score, baselineScore, delta, status }
  });

  return item;
}

async function createAlert(payload, actor = 'system') {
  const item = await Alert.create({
    ...payload,
    createdBy: actor,
    updatedBy: actor,
    updatedAt: new Date()
  });

  await logAudit({
    userId: actor,
    action: 'create',
    resourceType: 'alert',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { title: item.title, severity: item.severity, status: item.status }
  });

  return item;
}

async function acknowledgeAlert(alertId, acknowledgedBy = '', actor = 'system') {
  const item = await Alert.findByIdAndUpdate(
    alertId,
    {
      status: 'acknowledged',
      acknowledgedBy: acknowledgedBy || actor,
      acknowledgedAt: new Date(),
      updatedBy: actor,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!item) {
    const err = new Error('Alert not found');
    err.statusCode = 404;
    throw err;
  }

  await logAudit({
    userId: actor,
    action: 'acknowledge',
    resourceType: 'alert',
    resourceId: item._id,
    patientId: item.patientId,
    caseId: item.caseId,
    details: { acknowledgedBy: item.acknowledgedBy }
  });

  return item;
}

async function getPatientAlertSummary(patientId, caseId = null, actor = 'system') {
  const filter = { patientId, isDeleted: false };
  if (caseId) filter.caseId = caseId;

  const [alerts, progressScores] = await Promise.all([
    Alert.find(filter).sort({ createdAt: -1 }).lean(),
    ProgressScore.find(filter).sort({ createdAt: -1 }).lean()
  ]);

  const latestProgressScore = progressScores.length ? progressScores[0].score : null;
  const summary = {
    totalAlerts: alerts.length,
    openAlerts: alerts.filter((alert) => alert.status === 'open').length,
    acknowledgedAlerts: alerts.filter((alert) => alert.status === 'acknowledged').length,
    totalProgressScores: progressScores.length,
    latestProgressScore,
    highestSeverity: alerts.length ? alerts.reduce((max, alert) => {
      const order = { info: 1, warning: 2, critical: 3 };
      return order[alert.severity] > order[max] ? alert.severity : max;
    }, 'info') : 'info'
  };

  await logAudit({
    userId: actor,
    action: 'read',
    resourceType: 'alert_summary',
    resourceId: patientId,
    patientId,
    caseId,
    details: { summary }
  });

  return { alerts, progressScores, summary };
}

async function getPatientTrendSummary(patientId, caseId = null) {
  const result = await getTreatmentTrend(patientId, caseId);
  return result;
}

module.exports = {
  createProgressScore,
  createAlert,
  acknowledgeAlert,
  getPatientAlertSummary,
  getPatientTrendSummary
};
