require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const User = require('./models/User');
const Document = require('./models/Document');
const ImagingMetadata = require('./models/ImagingMetadata');
const ContraindicationRule = require('./models/ContraindicationRule');
const patientRoutes = require('./routes/patientRoutes');
const caseRoutes = require('./routes/caseRoutes');
const clinicalRoutes = require('./routes/clinicalRoutes');
const historyRoutes = require('./routes/historyRoutes');
const documentRoutes = require('./routes/documentRoutes');
const planRoutes = require('./routes/planRoutes');
const decisionSupportRoutes = require('./routes/decisionSupportRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const outcomeRoutes = require('./routes/outcomeRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const observabilityRoutes = require('./routes/observabilityRoutes');
const usageTracking = require('./middleware/usageTracking');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { hashPassword, isPasswordValid, signAccessToken, signRefreshToken, verifyRefreshToken, resetLoginAttempts, registerFailedLogin, applyLoginLockout } = require('./services/securityService');

const app = express();
const getPort = () => Number(process.env.PORT || 3000);
const getDbUrl = () => process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_info';

const reviewSchema = new mongoose.Schema({
  name: String,
  text: String,
  date: { type: Date, default: Date.now }
}, { collection: 'reviews' });

const Review = mongoose.model('Review', reviewSchema);

const appointmentSchema = new mongoose.Schema({
  doctorId: { type: String, default: 'Dr.AmitSharma' },
  dateKey: { type: String, required: true },
  timeSlot: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fee: { type: Number, default: 1200 },
  status: { type: String, default: 'Confirmed' }
}, { collection: 'appointments' });

const Appointment = mongoose.model('Appointment', appointmentSchema);

async function connectDatabase() {
  try {
    await mongoose.connect(getDbUrl());
    console.log('Connected to MongoDB:', getDbUrl());
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

function signJwt(user) {
  return signAccessToken(user);
}

async function ensureSeedUser() {
  const adminExists = await User.findOne({ username: 'admin@vitals.local' });
  if (!adminExists) {
    const passwordHash = await hashPassword('Admin123!');
    await User.create({
      username: 'admin@vitals.local',
      name: 'System Admin',
      password: passwordHash,
      role: 'admin',
      permissions: ['patient:read', 'patient:write', 'case:read', 'case:write', 'clinical:read', 'clinical:write', 'audit:read', 'user:read', 'user:write'],
      tenantId: 'default'
    });
  }
}

async function ensureSeedData() {
  const docCount = await Document.countDocuments({ tenantId: 'default', isDeleted: false });
  if (docCount === 0) {
    await Document.create({
      tenantId: 'default',
      ownerEntity: 'patient',
      ownerId: new mongoose.Types.ObjectId(),
      documentType: 'consent',
      originalFileName: 'sample-consent.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      storageProvider: 'local',
      storageKey: 'default/sample-consent.pdf',
      checksum: 'sample-checksum',
      version: 1,
      uploadedBy: 'system',
      status: 'uploaded',
      virusScanStatus: 'clean',
      retentionDays: 3650,
      notes: 'Seed document for dev environment'
    });
  }

  const imagingCount = await ImagingMetadata.countDocuments({ tenantId: 'default', isDeleted: false });
  if (imagingCount === 0) {
    await ImagingMetadata.create({
      tenantId: 'default',
      documentId: null,
      modality: 'MRI',
      studyType: 'regenerative-plan',
      sourceSystem: 'seed-data',
      acquisitionDate: new Date(),
      imageCount: 1,
      width: 2048,
      height: 1536,
      fileSizeBytes: 4194304,
      storageKey: 'default/seed-mri.dcm',
      checksum: 'seed-image-checksum',
      qualityScore: 90,
      qualityStatus: 'pass',
      blurMetric: 78,
      missingMetadata: [],
      technicalFlags: [],
      status: 'active'
    });
  }

  const ruleCount = await ContraindicationRule.countDocuments({ tenantId: 'default', isDeleted: false });
  if (ruleCount === 0) {
    await ContraindicationRule.insertMany([
      {
        tenantId: 'default',
        name: 'Penicillin allergy',
        category: 'allergy',
        severity: 'hard',
        message: 'Penicillin allergy is a hard contraindication for beta-lactam exposure.',
        recommendation: 'Use alternative antibiotic coverage and document chart review before approval.',
        conditions: [{ field: 'allergy', operator: 'in', value: ['Penicillin', 'Amoxicillin'], description: 'Any matched allergy prohibits the protocol' }],
        active: true
      },
      {
        tenantId: 'default',
        name: 'Autoimmune condition',
        category: 'comorbidity',
        severity: 'warning',
        message: 'Autoimmune disease requires enhanced monitoring during regenerative therapy.',
        recommendation: 'Escalate to specialist review and adjust follow-up schedule.',
        conditions: [{ field: 'comorbidity', operator: 'contains', value: 'autoimmune', description: 'Autoimmune conditions require extra review' }],
        active: true
      },
      {
        tenantId: 'default',
        name: 'Cell therapy exposure watch',
        category: 'therapy',
        severity: 'warning',
        therapy: 'PRP + MSC',
        message: 'This protocol requires a documented immunology screening step before approval.',
        recommendation: 'Confirm patient suitability before approving the therapy plan.',
        conditions: [{ field: 'therapy', operator: 'eq', value: 'PRP + MSC', description: 'Cell-based regenerative therapies need a review step' }],
        active: true
      }
    ]);
  }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const sessionStore = process.env.NODE_ENV === 'test' ? undefined : MongoStore.create({ mongoUrl: getDbUrl() });

app.use(session({
  secret: process.env.SESSION_SECRET || 'sachidanand_secret_key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(usageTracking);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/signup', async (req, res) => {
  const { name, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).json({ success: false, error: 'User exists. Please login.' });
    if (!isPasswordValid(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name || 'New Member',
      username,
      password: hashedPassword,
      role: 'clinician',
      tenantId: 'default'
    });

    req.session.userId = newUser._id;
    req.session.username = newUser.name;
    return res.redirect('/login');
  } catch (error) {
    console.error('signup error', error);
    return res.status(500).json({ success: false, error: 'Unable to sign up' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    const locked = await applyLoginLockout(user);
    if (locked) return res.status(423).json({ success: false, error: 'Account temporarily locked due to repeated failed login attempts' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await registerFailedLogin(user);
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    await resetLoginAttempts(user);
    req.session.userId = user._id;
    req.session.username = user.name;
    const token = signJwt(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true, token, refreshToken, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  return res.json({ success: true, user: { id: req.session.userId, name: req.session.username } });
});

app.get('/api/health', (req, res) => {
  const readyState = mongoose.connection.readyState;
  return res.json({
    success: true,
    data: {
      status: readyState === 1 ? 'connected' : 'disconnected',
      database: mongoose.connection.name || 'unknown',
      readyState,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/health/db', (req, res) => {
  const readyState = mongoose.connection.readyState;
  return res.json({ success: true, data: { status: readyState === 1 ? 'connected' : 'disconnected', readyState } });
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password are required' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const locked = await applyLoginLockout(user);
    if (locked) return res.status(423).json({ success: false, error: 'Account temporarily locked due to repeated failed login attempts' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await registerFailedLogin(user);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = signJwt(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await resetLoginAttempts(user);
    await user.save();
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true, token, refreshToken, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
    if (!refreshToken) return res.status(401).json({ success: false, error: 'Refresh token required' });
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
    const accessToken = signJwt(user);
    return res.json({ success: true, token: accessToken });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
    if (refreshToken) {
      const user = await User.findOne({ refreshTokens: refreshToken });
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter((token) => token !== refreshToken);
        await user.save();
      }
    }
    res.clearCookie('refreshToken');
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' });
    }
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ success: false, error: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name || 'New Member',
      username,
      password: hashedPassword,
      role: role || 'clinician',
      tenantId: 'default'
    });
    return res.status(201).json({ success: true, token: signJwt(user), user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ date: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.get('/api/appointments/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const appointments = await Appointment.find({ doctorId }, 'dateKey timeSlot -_id');
    const bookedMap = appointments.reduce((acc, current) => {
      acc[current.dateKey] = acc[current.dateKey] || [];
      acc[current.dateKey].push(current.timeSlot);
      return acc;
    }, {});
    res.json(bookedMap);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in to book an appointment.' });
  }

  const { dateKey, timeSlot, doctorId, fee } = req.body;

  try {
    const newAppointment = new Appointment({
      doctorId,
      dateKey,
      timeSlot,
      userId: req.session.userId,
      fee: fee || 1200
    });

    await newAppointment.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving appointment:', error);
    res.status(500).json({ error: 'Failed to save appointment' });
  }
});

app.post('/api/reviews', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, text } = req.body;
  try {
    const newReview = new Review({ name, text });
    await newReview.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

app.use('/api/patients', patientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/decision-support', decisionSupportRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/observability', observabilityRoutes);

app.use('/patient-intake', express.static(path.join(__dirname, 'patient-intake.html')));
app.use('/treatment-plan', express.static(path.join(__dirname, 'treatment-plan.html')));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(err => ({ field: err.path, msg: err.msg })) });
  }
  return next();
});

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await connectDatabase();
  await ensureSeedUser();
  await ensureSeedData();

  const port = getPort();

  if (!app.locals.server) {
    app.locals.server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  }

  return app.locals.server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, connectDatabase, ensureSeedUser };
