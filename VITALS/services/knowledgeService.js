const KnowledgeBaseEntry = require('../models/KnowledgeBaseEntry');

async function createKnowledgeEntry(data = {}, actor = 'system') {
  const payload = {
    tenantId: data.tenantId || 'default',
    patientId: data.patientId || null,
    caseId: data.caseId || null,
    title: data.title || 'Untitled knowledge entry',
    category: data.category || 'general',
    source: data.source || 'manual',
    excerpt: data.excerpt || '',
    url: data.url || '',
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    status: data.status || 'active',
    createdBy: actor,
    updatedBy: actor
  };

  const entry = await KnowledgeBaseEntry.create(payload);
  return entry.toObject();
}

async function searchKnowledgeEntries({ query = '', category = '', status = '' } = {}) {
  const search = String(query || '').trim();
  const filter = { isDeleted: false };

  if (category) filter.category = category;
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { excerpt: new RegExp(search, 'i') },
      { source: new RegExp(search, 'i') },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const entries = await KnowledgeBaseEntry.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  return {
    query: search,
    total: entries.length,
    results: entries
  };
}

async function getKnowledgeSummary({ patientId = null, caseId = null } = {}) {
  const filter = { isDeleted: false };

  if (patientId) filter.patientId = patientId;
  if (caseId) filter.caseId = caseId;

  const entries = await KnowledgeBaseEntry.find(filter).sort({ createdAt: -1 }).lean();
  const byCategory = {};
  entries.forEach((entry) => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  });

  return {
    totalKnowledgeEntries: entries.length,
    activeKnowledgeEntries: entries.filter((entry) => entry.status === 'active').length,
    categories: byCategory,
    recentEntries: entries.slice(0, 10)
  };
}

module.exports = {
  createKnowledgeEntry,
  searchKnowledgeEntries,
  getKnowledgeSummary
};
