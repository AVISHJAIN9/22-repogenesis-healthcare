const API = {
  base: '/api',
  token: null,
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(`${this.base}${path}`, {
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.errors?.[0]?.msg || 'Request failed');
    }
    return payload;
  }
};

async function loginAsDefaultUser() {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@vitals.local', password: 'admin123' })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Login failed');
    API.token = payload.token;
    document.getElementById('authStatus').textContent = `Authenticated as ${payload.user.role}`;
    await loadPatients();
  } catch (error) {
    document.getElementById('authStatus').textContent = `Auth failed: ${error.message}`;
    console.error(error);
  }
}

function setStatus(id, message, type = 'success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = type === 'error' ? 'error' : 'success';
}

function parseListValue(value) {
  if (!value || !value.trim()) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function loadPatients() {
  try {
    const response = await API.request('/patients?page=1&limit=20');
    const list = document.getElementById('patientList');
    list.innerHTML = '';
    if (!response.data.docs.length) {
      list.innerHTML = '<li>No patients found</li>';
      return;
    }

    for (const patient of response.data.docs) {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${patient.firstName} ${patient.lastName}</strong> — ${patient.patientNumber || 'new patient'}<br><span class="muted">${patient.email || 'No email'} • ${patient.phone || 'No phone'}</span>`;
      item.addEventListener('click', () => {
        document.getElementById('casePatientId').value = patient._id;
        document.getElementById('historyPatientId').value = patient._id;
        document.getElementById('diagnosisPatientId').value = patient._id;
        document.getElementById('symptomPatientId').value = patient._id;
        document.getElementById('treatmentPatientId').value = patient._id;
        document.getElementById('medicationPatientId').value = patient._id;
        document.getElementById('allergyPatientId').value = patient._id;
        document.getElementById('comorbidityPatientId').value = patient._id;
      });
      list.appendChild(item);
    }
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('patientForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('patientMessage', 'Submitting...', 'success');
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  try {
    await API.request('/patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setStatus('patientMessage', 'Patient created successfully', 'success');
    event.target.reset();
    await loadPatients();
  } catch (error) {
    setStatus('patientMessage', error.message, 'error');
  }
});

document.getElementById('caseForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('caseMessage', 'Submitting...', 'success');
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  try {
    const result = await API.request('/cases', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setStatus('caseMessage', `Case created: ${result.data.caseNumber}`, 'success');
    document.getElementById('historyCaseId').value = result.data._id;
    document.getElementById('diagnosisCaseId').value = result.data._id;
    document.getElementById('symptomCaseId').value = result.data._id;
    document.getElementById('treatmentCaseId').value = result.data._id;
    document.getElementById('medicationCaseId').value = result.data._id;
    document.getElementById('allergyCaseId').value = result.data._id;
    document.getElementById('comorbidityCaseId').value = result.data._id;
    event.target.reset();
  } catch (error) {
    setStatus('caseMessage', error.message, 'error');
  }
});

document.getElementById('historyForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('historyMessage', 'Saving...', 'success');
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  payload.pastMedicalHistory = parseListValue(payload.pastMedicalHistory);
  payload.surgicalHistory = parseListValue(payload.surgicalHistory);
  payload.allergies = parseListValue(payload.allergies);
  payload.currentMedications = parseListValue(payload.currentMedications);
  payload.comorbidities = parseListValue(payload.comorbidities);

  try {
    await API.request('/clinical/medical-history', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setStatus('historyMessage', 'Medical history saved', 'success');
    event.target.reset();
  } catch (error) {
    setStatus('historyMessage', error.message, 'error');
  }
});

document.getElementById('diagnosisForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('diagnosisMessage', 'Saving...', 'success');
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  try {
    await API.request('/clinical/diagnoses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setStatus('diagnosisMessage', 'Diagnosis saved', 'success');
    event.target.reset();
  } catch (error) {
    setStatus('diagnosisMessage', error.message, 'error');
  }
});

const batch2Forms = [
  { id: 'symptomForm', path: '/history/symptoms', message: 'symptomMessage', normalize: (payload) => ({ ...payload, severity: payload.severity || 'moderate' }) },
  { id: 'treatmentForm', path: '/history/treatments', message: 'treatmentMessage', normalize: (payload) => ({ ...payload, status: payload.status || 'completed' }) },
  { id: 'medicationForm', path: '/history/medications', message: 'medicationMessage', normalize: (payload) => ({ ...payload, status: payload.status || 'active' }) },
  { id: 'allergyForm', path: '/history/allergies', message: 'allergyMessage', normalize: (payload) => ({ ...payload, severity: payload.severity || 'moderate', status: payload.status || 'active' }) },
  { id: 'comorbidityForm', path: '/history/comorbidities', message: 'comorbidityMessage', normalize: (payload) => ({ ...payload, status: payload.status || 'active' }) }
];

for (const formConfig of batch2Forms) {
  const form = document.getElementById(formConfig.id);
  if (!form) continue;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(formConfig.message, 'Saving...', 'success');
    const formData = new FormData(event.target);
    const payload = formConfig.normalize(Object.fromEntries(formData.entries()));
    try {
      await API.request(formConfig.path, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setStatus(formConfig.message, 'Saved successfully', 'success');
      event.target.reset();
    } catch (error) {
      setStatus(formConfig.message, error.message, 'error');
    }
  });
}

loginAsDefaultUser();
