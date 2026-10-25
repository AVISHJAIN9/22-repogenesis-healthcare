const UsageEvent = require('../models/UsageEvent');
const ErrorEvent = require('../models/ErrorEvent');
const MetricSnapshot = require('../models/MetricSnapshot');
const JobRun = require('../models/JobRun');

async function createUsageEvent(data = {}) {
  const event = await UsageEvent.create({
    tenantId: data.tenantId || 'default',
    route: data.route || 'unknown',
    method: data.method || 'GET',
    statusCode: Number(data.statusCode || 200),
    durationMs: Number(data.durationMs || 0),
    actorRole: data.actorRole || 'system',
    actorId: data.actorId || null
  });

  return event.toObject();
}

async function createErrorEvent(data = {}) {
  const event = await ErrorEvent.create({
    tenantId: data.tenantId || 'default',
    route: data.route || '',
    message: data.message || 'Unknown error',
    severity: data.severity || 'error',
    fingerprint: data.fingerprint || '',
    stack: data.stack || ''
  });

  return event.toObject();
}

async function createMetricSnapshot(data = {}) {
  const metric = await MetricSnapshot.create({
    tenantId: data.tenantId || 'default',
    name: data.name || 'unknown_metric',
    value: Number(data.value || 0),
    unit: data.unit || '',
    group: data.group || 'system'
  });

  return metric.toObject();
}

async function createJobRun(data = {}) {
  const job = await JobRun.create({
    tenantId: data.tenantId || 'default',
    jobName: data.jobName || 'unnamed_job',
    status: data.status || 'queued',
    startedAt: data.startedAt || new Date(),
    finishedAt: data.finishedAt || null,
    errorMessage: data.errorMessage || '',
    createdBy: data.createdBy || 'system',
    updatedBy: data.updatedBy || data.createdBy || 'system'
  });

  return job.toObject();
}

async function getObservabilitySummary({ tenantId = 'default' } = {}) {
  const [usageEvents, errorEvents, metrics, jobs] = await Promise.all([
    UsageEvent.find({ tenantId }).sort({ createdAt: -1 }).lean(),
    ErrorEvent.find({ tenantId }).sort({ createdAt: -1 }).lean(),
    MetricSnapshot.find({ tenantId }).sort({ createdAt: -1 }).lean(),
    JobRun.find({ tenantId }).sort({ createdAt: -1 }).lean()
  ]);

  const totalRequests = usageEvents.length;
  const failedRequests = usageEvents.filter((event) => event.statusCode >= 400).length;
  const avgLatency = totalRequests
    ? usageEvents.reduce((sum, event) => sum + Number(event.durationMs || 0), 0) / totalRequests
    : 0;

  const metricSummary = {};
  metrics.forEach((entry) => {
    metricSummary[entry.name] = entry.value;
  });

  return {
    totalUsageEvents: totalRequests,
    totalErrorEvents: errorEvents.length,
    totalMetrics: metrics.length,
    totalJobs: jobs.length,
    failedJobs: jobs.filter((job) => job.status === 'failed').length,
    failedRequests,
    averageLatencyMs: Number(avgLatency.toFixed(2)),
    metrics: metricSummary,
    recentEvents: usageEvents.slice(0, 10),
    recentErrors: errorEvents.slice(0, 10)
  };
}

module.exports = {
  createUsageEvent,
  createErrorEvent,
  createMetricSnapshot,
  createJobRun,
  getObservabilitySummary
};
