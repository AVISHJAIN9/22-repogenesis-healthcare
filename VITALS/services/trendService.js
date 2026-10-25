const ProgressScore = require('../models/ProgressScore');

async function getTreatmentTrend(patientId, caseId = null) {
  const filter = { patientId, isDeleted: false };
  if (caseId) filter.caseId = caseId;

  const scores = await ProgressScore.find(filter).sort({ createdAt: 1 }).lean();

  const trendSummary = {
    baseline: scores.length ? scores[0].score : null,
    latest: scores.length ? scores[scores.length - 1].score : null,
    delta: scores.length > 1 ? scores[scores.length - 1].score - scores[0].score : 0,
    hasImprovement: scores.length > 1 ? scores[scores.length - 1].score >= scores[0].score : false,
    totalSamples: scores.length
  };

  return {
    trends: scores,
    trendSummary
  };
}

module.exports = {
  getTreatmentTrend
};
