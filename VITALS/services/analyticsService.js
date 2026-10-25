const ProtocolKnowledge = require('../models/ProtocolKnowledge');
const EvidenceLink = require('../models/EvidenceLink');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');

async function createProtocol(data = {}, actor = 'system') {
  const protocol = await ProtocolKnowledge.create({
    tenantId: data.tenantId || 'default',
    name: data.name || 'Untitled protocol',
    category: data.category || 'general',
    version: data.version || 'v1',
    status: data.status || 'active',
    summary: data.summary || '',
    createdBy: actor,
    updatedBy: actor
  });

  return protocol.toObject();
}

async function createEvidenceLink(data = {}, actor = 'system') {
  const evidence = await EvidenceLink.create({
    tenantId: data.tenantId || 'default',
    protocolId: data.protocolId,
    title: data.title || 'Evidence link',
    citation: data.citation || '',
    sourceType: data.sourceType || 'journal',
    summary: data.summary || '',
    url: data.url || '',
    createdBy: actor,
    updatedBy: actor
  });

  return evidence.toObject();
}

async function recordAnalyticsSnapshot(data = {}, actor = 'system') {
  const snapshot = await AnalyticsSnapshot.create({
    tenantId: data.tenantId || 'default',
    metricName: data.metricName || 'unknown_metric',
    value: Number(data.value || 0),
    unit: data.unit || '',
    category: data.category || 'general',
    summary: data.summary || '',
    createdBy: actor,
    updatedBy: actor
  });

  return snapshot.toObject();
}

async function getAnalyticsSummary({ tenantId = 'default' } = {}) {
  const [protocols, evidenceLinks, snapshots] = await Promise.all([
    ProtocolKnowledge.find({ tenantId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    EvidenceLink.find({ tenantId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    AnalyticsSnapshot.find({ tenantId, isDeleted: false }).sort({ createdAt: -1 }).lean()
  ]);

  const protocolByStatus = {};
  protocols.forEach((protocol) => {
    protocolByStatus[protocol.status] = (protocolByStatus[protocol.status] || 0) + 1;
  });

  const metrics = {};
  snapshots.forEach((snapshot) => {
    metrics[snapshot.metricName] = snapshot.value;
  });

  return {
    totalProtocols: protocols.length,
    totalEvidenceLinks: evidenceLinks.length,
    totalSnapshots: snapshots.length,
    protocolByStatus,
    metrics,
    recentSnapshots: snapshots.slice(0, 10)
  };
}

module.exports = {
  createProtocol,
  createEvidenceLink,
  recordAnalyticsSnapshot,
  getAnalyticsSummary
};
