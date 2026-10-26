const observabilityService = require('../services/observabilityService');

module.exports = function usageTracking(req, res, next) {
  const startTime = Date.now();

  const originalEnd = res.end;
  res.end = function (...args) {
    const durationMs = Date.now() - startTime;
    const route = req.originalUrl || req.url || 'unknown';

    observabilityService.createUsageEvent({
      tenantId: req.session?.tenantId || 'default',
      route,
      method: req.method || 'GET',
      statusCode: res.statusCode || 200,
      durationMs,
      actorRole: req.user?.role || 'system',
      actorId: req.user?._id || null
    }).catch(() => undefined);

    observabilityService.createMetricSnapshot({
      tenantId: req.session?.tenantId || 'default',
      name: 'request_latency_ms',
      value: durationMs,
      unit: 'ms',
      group: 'http'
    }).catch(() => undefined);

    return originalEnd.apply(this, args);
  };

  next();
};
