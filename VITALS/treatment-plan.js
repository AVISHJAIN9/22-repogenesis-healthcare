document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('planForm');
  const result = document.getElementById('planResult');
  const timeline = document.getElementById('timeline');
  const recommendBtn = document.getElementById('recommendBtn');
  const recommendations = document.getElementById('recommendations');
  const compareBtn = document.getElementById('compareBtn');
  const compareResult = document.getElementById('compareResult');

  const buildPlanPayload = (values) => ({
    patientId: values.patientId,
    caseId: values.caseId,
    target: values.target,
    objective: values.objective,
    therapy: values.therapy,
    status: values.status,
    notes: values.notes,
    components: [
      { name: 'Assessment', type: 'assessment', dose: 'Baseline review', schedule: 'Week 0' },
      { name: 'Intervention', type: 'therapy', dose: values.therapy, schedule: 'Week 2' }
    ],
    timeline: [
      { phase: 'Assessment', startOffsetDays: 0, durationDays: 7, dependencies: [] },
      { phase: 'Intervention', startOffsetDays: 7, durationDays: 21, dependencies: ['Assessment'] },
      { phase: 'Follow-up', startOffsetDays: 28, durationDays: 21, dependencies: ['Intervention'] }
    ]
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify(buildPlanPayload(values))
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || json.errors?.[0]?.msg || 'Plan could not be created');
      }

      result.textContent = `Plan created successfully: ${json.data._id}`;
      result.classList.remove('hide');
      result.classList.remove('hard-alert');
      timeline.innerHTML = (json.data.timeline || []).map((phase) => `
        <div class="timeline-item">
          <strong>${phase.phase}</strong><br />
          Starts in ${phase.startOffsetDays} days · Duration ${phase.durationDays} days
        </div>
      `).join('');
    } catch (error) {
      result.textContent = error.message;
      result.classList.remove('hide');
      result.classList.add('hard-alert');
    }
  });

  recommendBtn.addEventListener('click', async () => {
    const payload = {
      therapy: document.querySelector('[name="therapy"]').value,
      patientId: document.querySelector('[name="patientId"]').value || null,
      caseId: document.querySelector('[name="caseId"]').value || null
    };

    const response = await fetch('/api/plans/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (!json.success) {
      recommendations.innerHTML = '<div class="recommendation-item">No recommendations were returned.</div>';
      return;
    }

    recommendations.innerHTML = (json.data || []).map((entry) => `
      <div class="recommendation-item">
        <strong>${entry.name}</strong><br />
        <span>${entry.recommendation}</span><br />
        <small>${entry.why}</small>
      </div>
    `).join('');
  });

  compareBtn.addEventListener('click', async () => {
    const response = await fetch('/api/plans/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify({ planAId: document.getElementById('planAId').value, planBId: document.getElementById('planBId').value })
    });
    const json = await response.json();
    if (!json.success) {
      compareResult.innerHTML = '<div class="inline-alert hard-alert">Unable to compare plans.</div>';
      return;
    }

    compareResult.innerHTML = (json.data.diff || []).map((item) => `
      <div class="plan-card">
        <strong>${item.field}</strong><br />
        Before: ${JSON.stringify(item.before)}<br />
        After: ${JSON.stringify(item.after)}
      </div>
    `).join('') || '<div class="plan-card">No changes detected.</div>';
  });
});
