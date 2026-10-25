require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Patient = require('./models/Patient');
const CareCase = require('./models/Case');
const MedicalHistory = require('./models/MedicalHistory');
const Diagnosis = require('./models/Diagnosis');

const seed = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_info';
  await mongoose.connect(uri);

  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    CareCase.deleteMany({}),
    MedicalHistory.deleteMany({}),
    Diagnosis.deleteMany({})
  ]);

  const adminPassword = await bcrypt.hash('admin123', 10);
  const clinician = await User.create({
    name: 'Dr. Meera Singh',
    username: 'admin@vitals.local',
    password: adminPassword,
    role: 'admin',
    tenantId: 'default'
  });

  const patientOne = await Patient.create({
    patientNumber: 'PT-0001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: 'aarav@example.com',
    phone: '9123456789',
    dateOfBirth: new Date('1985-06-12'),
    gender: 'Male',
    address: 'MG Road, Pune',
    emergencyContactName: 'Neha Sharma',
    emergencyContactPhone: '9876543210',
    consentForTreatment: true,
    createdBy: clinician._id.toString(),
    updatedBy: clinician._id.toString()
  });

  const caseOne = await CareCase.create({
    patientId: patientOne._id,
    caseNumber: 'CASE-0001',
    status: 'new',
    caseType: 'Regenerative Medicine',
    chiefComplaint: 'Chronic joint pain',
    treatmentGoal: 'Reduce inflammation and improve mobility',
    assignedClinician: 'Dr. Meera Singh',
    createdBy: clinician._id.toString(),
    updatedBy: clinician._id.toString()
  });

  await MedicalHistory.create({
    patientId: patientOne._id,
    caseId: caseOne._id,
    pastMedicalHistory: ['Hypertension'],
    allergies: ['Penicillin'],
    currentMedications: ['Vitamin D'],
    comorbidities: ['Obesity'],
    notes: 'Patient is otherwise healthy',
    createdBy: clinician._id.toString(),
    updatedBy: clinician._id.toString()
  });

  await Diagnosis.create({
    patientId: patientOne._id,
    caseId: caseOne._id,
    diagnosisName: 'Osteoarthritis',
    diagnosisCode: 'M17',
    severity: 'moderate',
    status: 'confirmed',
    clinicianName: 'Dr. Meera Singh',
    createdBy: clinician._id.toString(),
    updatedBy: clinician._id.toString()
  });

  console.log('Seeded patient intake data');
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
