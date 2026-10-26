const CareCase = require('../models/Case');
const AuditLog = require('../models/AuditLog');

async function createCase(data, actor = 'system') {
  const payload = {
    ...data,
    createdBy: actor,
    updatedBy: actor,
    caseNumber: data.caseNumber || `CASE-${Date.now()}`
  };

  const item = await CareCase.create({
    ...payload,
    updatedAt: new Date()
  });

  await AuditLog.create({
    userId: actor,
    action: 'create',
    resourceType: 'case',
    resourceId: String(item._id),
    caseId: item._id,
    details: { caseNumber: item.caseNumber }
  });

  return item;
}

async function findCases(filter = {}, options = {}) {
  const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
  const query = { isDeleted: false, ...(filter || {}) };
  const skip = (Number(page) - 1) * Number(limit);
  const docs = await CareCase.find(query).sort(sort).skip(skip).limit(Number(limit)).lean();
  const total = await CareCase.countDocuments(query);
  return { docs, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 };
}

async function getCaseById(id) {
  return CareCase.findOne({ _id: id, isDeleted: false }).lean();
}

async function updateCaseStatus(id, status, actor = 'system') {
  const item = await CareCase.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { status, updatedBy: actor, updatedAt: new Date() },
    { new: true }
  );

  if (item) {
    await AuditLog.create({
      userId: actor,
      action: 'update',
      resourceType: 'case',
      resourceId: String(item._id),
      caseId: item._id,
      details: { status }
    });
  }

  return item;
}

module.exports = { createCase, findCases, getCaseById, updateCaseStatus };
