const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getFirebaseMessaging } = require('./services/firebaseService');
require('dotenv').config();

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'change-admin-jwt-secret-in-production';

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'templates');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF) and MP4 videos are allowed.'));
    }
  }
});

const carouselDir = path.join(__dirname, 'uploads', 'carousel');
const partyLogoDir = path.join(__dirname, 'uploads', 'political-logos');
const profilesUploadDir = path.join(__dirname, 'uploads', 'profiles');
for (const dir of [carouselDir, partyLogoDir, profilesUploadDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const carouselUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, carouselDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `carousel-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, or WebP images'), ok);
  },
});

const partyLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, partyLogoDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `party-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, or WebP images'), ok);
  },
});

const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profilesUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image uploads are allowed'), ok);
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '12mb' }));
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chitrakal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

/**
 * When first_name, last_name, and category are present but profile_complete was never set
 * (legacy complete-profile updates), persist profile_complete = true.
 */
async function syncProfileCompleteIfEligible(user) {
  if (!user || user.id == null) return user;
  const fn = user.first_name != null ? String(user.first_name).trim() : '';
  const ln = user.last_name != null ? String(user.last_name).trim() : '';
  const cat = user.category != null ? String(user.category).trim() : '';
  if (!fn || !ln || !cat || user.profile_complete) return user;
  const fixed = await pool.query(
    `UPDATE profiles SET profile_complete = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [user.id]
  );
  return fixed.rows[0] || user;
}

async function ensureAdminUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email VARCHAR(255) NOT NULL DEFAULT '',
      name VARCHAR(255),
      role VARCHAR(32) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'designer', 'creative_head'))
    )
  `);
}

async function seedAdminUserFromEnv() {
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!password) return;
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const email = (process.env.ADMIN_EMAIL || `${username}@local`).trim();
  const name = (process.env.ADMIN_NAME || 'Admin').trim();
  const role = ['admin', 'designer', 'creative_head'].includes(process.env.ADMIN_ROLE)
    ? process.env.ADMIN_ROLE
    : 'admin';
  const existing = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
  if (existing.rows.length > 0) return;
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, email, name, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [username, password_hash, email, name, role]
  );
  console.log(`✅ Seeded workspace admin user "${username}" (set ADMIN_PASSWORD in .env to control password)`);
}

async function ensureAdminContentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_broadcasts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data JSONB,
      language VARCHAR(128),
      state VARCHAR(255),
      district VARCHAR(255),
      tahsil VARCHAR(255),
      recipient_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_carousel_slides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_url TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      type VARCHAR(32) NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS political_parties (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      short_name VARCHAR(64),
      logo_url TEXT,
      color VARCHAR(32),
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_national BOOLEAN NOT NULL DEFAULT false,
      UNIQUE (name)
    )
  `);
  await pool.query(`
    ALTER TABLE political_parties
    ADD COLUMN IF NOT EXISTS is_national BOOLEAN NOT NULL DEFAULT false
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_suggestions (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_suggestions_created_at
    ON user_suggestions (created_at DESC)
  `);
}

/**
 * Mobile users live in `profiles`; admin broadcasts insert notifications with profile ids.
 * Older DBs often have notifications.user_id → users(id), while new signups only touch profiles,
 * which causes FK violations. Point the FK at profiles when needed.
 */
async function ensureNotificationsUserFkReferencesProfiles() {
  try {
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*)::int AS n
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('notifications', 'profiles')`
    );
    if (!cntRows[0] || cntRows[0].n < 2) return;

    const { rows: fkRows } = await pool.query(
      `SELECT tc.constraint_name, ccu.table_name AS ref_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_schema = kcu.constraint_schema
          AND tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_schema = tc.constraint_schema
          AND ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'notifications'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'user_id'
        LIMIT 1`
    );

    if (fkRows.length === 0) {
      await pool
        .query(
          `ALTER TABLE notifications
             ADD CONSTRAINT notifications_user_id_fkey
             FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE`
        )
        .catch(() => {});
      return;
    }

    const { constraint_name: fkName, ref_table: refTable } = fkRows[0];
    if (refTable === 'profiles') return;

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(fkName || ''))) {
      console.warn('⚠️ Unexpected notifications.user_id FK constraint name:', fkName);
      return;
    }
    await pool.query(`ALTER TABLE notifications DROP CONSTRAINT ${fkName}`);
  } catch (e) {
    console.warn('⚠️ notifications FK check (drop legacy):', e.message);
    return;
  }

  try {
    await pool.query(
      `ALTER TABLE notifications
         ADD CONSTRAINT notifications_user_id_fkey
         FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE`
    );
    console.log('✅ notifications.user_id foreign key now references profiles');
  } catch (e) {
    console.warn(
      '⚠️ Could not add notifications.user_id → profiles FK (fix manually if broadcasts still fail):',
      e.message
    );
  }
}

// Test database connection + admin auth schema
(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    await ensureAdminUsersTable();
    await ensureAdminContentTables();
    await ensureNotificationsUserFkReferencesProfiles();
    await seedAdminUserFromEnv();
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS n FROM admin_users');
    if (countRows[0].n === 0) {
      console.warn(
        '⚠️ No workspace admin accounts. Set ADMIN_PASSWORD or ADMIN_BOOTSTRAP_PASSWORD (and optional ADMIN_USERNAME) in .env, then restart the server to create the first admin.'
      );
    }
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

const templateShareRoutes = require('./routes/templateShareRoutes');
app.use('/api/template-share', templateShareRoutes(pool));

const publicApiRoutes = require('./routes/publicApiRoutes');
app.use('/api', publicApiRoutes(pool));

// In-memory OTP storage (temporary, cleared on server restart)
const otpStore = new Map(); // phone -> { otp, expiresAt }

// Hardcoded OTPs for testing (remove in production)
// Note: OTPs must be 6 digits to match the frontend UI
const HARDCODED_OTPS = {
  '9876543210': '123456',
  '9876543211': '567890',
  '9876543212': '999999',
};

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// ==================== AUTH ROUTES ====================

const { verifyFirebaseIdToken } = require('./services/firebaseService');

function normalizePhoneTo10Digits(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  // Handles +91XXXXXXXXXX or any longer string by taking last 10 digits
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// Check if phone exists
app.post('/api/auth/check-phone', async (req, res) => {
  try {
    const phone = normalizePhoneTo10Digits(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
    }

    const result = await pool.query('SELECT id FROM profiles WHERE phone_number = $1', [phone]);
    return res.json({ success: true, exists: result.rows.length > 0 });
  } catch (error) {
    console.error('Check phone error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Firebase OTP fallback (dev only). We can't send OTP from backend without a provider.
// Frontend uses this only as a development fallback.
app.post('/api/auth/send-firebase-otp', async (req, res) => {
  try {
    const phone = normalizePhoneTo10Digits(req.body?.phone);
    const fallback = !!req.body?.fallback;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    if (!fallback) {
      return res.status(400).json({
        success: false,
        error: 'Backend OTP fallback is disabled. Use Firebase client OTP flow.',
      });
    }

    // "test-mode" tells the frontend to use backend test verification path.
    // No real SMS is sent here.
    return res.json({ success: true, verificationId: 'test-mode' });
  } catch (error) {
    console.error('Send Firebase OTP (fallback) error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Verify Firebase OTP: validate Firebase ID token (preferred) or test-mode fallback (dev).
app.post('/api/auth/verify-firebase-otp', async (req, res) => {
  try {
    const phone = normalizePhoneTo10Digits(req.body?.phone);
    const firebaseIdToken = req.body?.firebaseIdToken;
    const verificationId = req.body?.verificationId;
    const password = req.body?.password;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
    }

    // Test-mode fallback: allow account creation without Firebase token (dev convenience).
    if (verificationId === 'test-mode' && !firebaseIdToken) {
      // If password provided and user doesn't exist, create the account.
      const existing = await pool.query('SELECT * FROM profiles WHERE phone_number = $1', [phone]);
      if (existing.rows.length > 0) {
        const user = await syncProfileCompleteIfEligible(existing.rows[0]);
        return res.json({ success: true, user });
      }

      if (!password) {
        return res.status(400).json({ success: false, error: 'Password required for signup' });
      }

      const created = await pool.query(
        `INSERT INTO profiles (phone_number, password, profile_complete)
         VALUES ($1, $2, false)
         RETURNING *`,
        [phone, password]
      );
      return res.json({ success: true, user: created.rows[0] });
    }

    // Preferred: verify Firebase ID token.
    const decoded = await verifyFirebaseIdToken(firebaseIdToken);
    const tokenPhone10 = normalizePhoneTo10Digits(decoded?.phone_number || decoded?.phoneNumber || '');
    if (!tokenPhone10 || tokenPhone10 !== phone) {
      return res.status(401).json({ success: false, error: 'Invalid Firebase token for this phone number' });
    }

    // Upsert user: if exists, return it; else create if password provided.
    const existing = await pool.query('SELECT * FROM profiles WHERE phone_number = $1', [phone]);
    if (existing.rows.length > 0) {
      const user = await syncProfileCompleteIfEligible(existing.rows[0]);
      return res.json({ success: true, user });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password required for signup' });
    }

    const created = await pool.query(
      `INSERT INTO profiles (phone_number, password, profile_complete)
       VALUES ($1, $2, false)
       RETURNING *`,
      [phone, password]
    );
    return res.json({ success: true, user: created.rows[0] });
  } catch (error) {
    console.error('Verify Firebase OTP error:', error);
    if (error.code === '23505') {
      const phone = normalizePhoneTo10Digits(req.body?.phone);
      const existing = await pool.query('SELECT * FROM profiles WHERE phone_number = $1', [phone]);
      if (existing.rows.length > 0) {
        const user = await syncProfileCompleteIfEligible(existing.rows[0]);
        return res.json({ success: true, user });
      }
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Confirm Firebase phone ownership for password reset (no user session returned)
app.post('/api/auth/verify-phone-for-reset', async (req, res) => {
  try {
    const phone = normalizePhoneTo10Digits(req.body?.phone);
    const firebaseIdToken = req.body?.firebaseIdToken;
    const verificationId = req.body?.verificationId;

    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
    }

    if (verificationId === 'test-mode' && !firebaseIdToken) {
      const existing = await pool.query('SELECT id FROM profiles WHERE phone_number = $1', [phone]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No account found for this number' });
      }
      return res.json({ success: true });
    }

    if (!firebaseIdToken) {
      return res.status(400).json({ success: false, error: 'Verification required' });
    }

    const decoded = await verifyFirebaseIdToken(firebaseIdToken);
    const tokenPhone10 = normalizePhoneTo10Digits(decoded?.phone_number || decoded?.phoneNumber || '');
    if (!tokenPhone10 || tokenPhone10 !== phone) {
      return res.status(401).json({ success: false, error: 'Invalid Firebase token for this phone number' });
    }

    const existing = await pool.query('SELECT id FROM profiles WHERE phone_number = $1', [phone]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found for this number' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Verify phone for reset error:', error);
    return res.status(401).json({ success: false, error: error.message || 'Verification failed' });
  }
});

// Set new password after phone verification (Firebase ID token or dev test-mode)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const phone = normalizePhoneTo10Digits(req.body?.phone);
    const firebaseIdToken = req.body?.firebaseIdToken;
    const verificationId = req.body?.verificationId;
    const newPassword = req.body?.newPassword != null ? String(req.body.newPassword) : '';

    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    if (verificationId === 'test-mode' && !firebaseIdToken) {
      const updated = await pool.query(
        `UPDATE profiles SET password = $1, updated_at = NOW() WHERE phone_number = $2 RETURNING *`,
        [newPassword, phone]
      );
      if (updated.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No account found for this number' });
      }
      const user = await syncProfileCompleteIfEligible(updated.rows[0]);
      return res.json({ success: true, user });
    }

    if (!firebaseIdToken) {
      return res.status(400).json({ success: false, error: 'Verification required' });
    }

    const decoded = await verifyFirebaseIdToken(firebaseIdToken);
    const tokenPhone10 = normalizePhoneTo10Digits(decoded?.phone_number || decoded?.phoneNumber || '');
    if (!tokenPhone10 || tokenPhone10 !== phone) {
      return res.status(401).json({ success: false, error: 'Invalid Firebase token for this phone number' });
    }

    const updated = await pool.query(
      `UPDATE profiles SET password = $1, updated_at = NOW() WHERE phone_number = $2 RETURNING *`,
      [newPassword, phone]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found for this number' });
    }
    const user = await syncProfileCompleteIfEligible(updated.rows[0]);
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to reset password' });
  }
});

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const phone = normalizePhoneTo10Digits(req.body?.phone);
    const { password } = req.body;

    console.log('Signup request received:', { phone: phone ? `${phone.substring(0, 3)}***` : 'missing', hasPassword: !!password });

    if (!phone || !password) {
      console.log('Signup validation failed: missing phone or password');
      return res.status(400).json({ success: false, error: 'Phone and password required' });
    }

    // Validate phone number format (should be 10 digits)
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      console.log('Signup validation failed: invalid phone format');
      return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
    }

    // Check if phone already exists
    const existing = await pool.query(
      'SELECT id FROM profiles WHERE phone_number = $1',
      [phone]
    );

    if (existing.rows.length > 0) {
      console.log('Signup failed: phone number already registered');
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    // Insert new user
    const result = await pool.query(
      `INSERT INTO profiles (phone_number, password, profile_complete)
       VALUES ($1, $2, false)
       RETURNING *`,
      [phone, password]
    );

    console.log('Signup successful for phone:', phone.substring(0, 3) + '***');
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Signup error:', error);
    // Check for database constraint violations
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone and password required' });
    }

    const result = await pool.query(
      'SELECT * FROM profiles WHERE phone_number = $1 AND password = $2',
      [phone, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid phone or password' });
    }

    let user = await syncProfileCompleteIfEligible(result.rows[0]);

    // If user has completed profile, they can login directly (no OTP needed)
    // OTP is only required during initial signup/verification
    if (user.profile_complete) {
      return res.json({ success: true, user, requiresOTP: false });
    }

    // New users or incomplete profiles need OTP verification
    res.json({ success: true, user, requiresOTP: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    const otp = HARDCODED_OTPS[phone] || '000000'; // Default to 6-digit OTP
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in memory
    otpStore.set(phone, { otp, expiresAt });

    console.log(`OTP for ${phone}: ${otp}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    console.log('Verify OTP request received:', { 
      phone: phone ? `${phone.substring(0, 3)}***` : 'missing', 
      otpLength: otp ? otp.length : 0,
      otpPreview: otp ? `${otp.substring(0, 2)}****` : 'missing'
    });

    if (!phone || !otp) {
      console.log('Verify OTP validation failed: missing phone or OTP');
      return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }

    // Validate OTP format (should be 6 digits)
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      console.log('Verify OTP validation failed: invalid OTP format');
      return res.status(400).json({ success: false, error: 'OTP must be 6 digits' });
    }

    // Get OTP from memory
    const otpData = otpStore.get(phone);

    if (!otpData) {
      console.log('Verify OTP failed: No OTP session found for phone:', phone.substring(0, 3) + '***');
      console.log('Available OTP sessions:', Array.from(otpStore.keys()).map(p => p.substring(0, 3) + '***'));
      return res.status(400).json({ success: false, error: 'No OTP session found. Please request a new OTP.' });
    }

    // Check if expired
    if (otpData.expiresAt < Date.now()) {
      console.log('Verify OTP failed: OTP expired');
      otpStore.delete(phone);
      return res.status(400).json({ success: false, error: 'OTP expired. Please request a new OTP.' });
    }

    // Check if OTP matches
    console.log('Comparing OTPs - Expected:', otpData.otp, 'Received:', otp);
    if (otpData.otp !== otp) {
      console.log('Verify OTP failed: OTP mismatch');
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // Get user profile
    const userResult = await pool.query(
      'SELECT * FROM profiles WHERE phone_number = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      console.log('Verify OTP failed: User not found');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Delete OTP after successful verification (one-time use)
    otpStore.delete(phone);
    console.log('OTP verified successfully for phone:', phone.substring(0, 3) + '***');

    res.json({ success: true, user: userResult.rows[0] });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Complete Profile
app.put('/api/auth/complete-profile', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;

    console.log('Complete profile request received:', {
      userId,
      profileData: {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        state: profileData.state,
        district: profileData.district,
        tahsil: profileData.tahsil,
        designation: profileData.designation,
        political_party: profileData.political_party,
      },
    });

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Build dynamic update query to only update provided fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Only include fields that are provided (not undefined)
    if (profileData.first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      values.push(profileData.first_name || null);
    }
    if (profileData.middle_name !== undefined) {
      updateFields.push(`middle_name = $${paramIndex++}`);
      values.push(profileData.middle_name || null);
    }
    if (profileData.last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      values.push(profileData.last_name || null);
    }
    if (profileData.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(profileData.title || null);
    }
    if (profileData.alternate_phone !== undefined) {
      updateFields.push(`alternate_phone = $${paramIndex++}`);
      values.push(profileData.alternate_phone || null);
    }
    if (profileData.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      values.push(profileData.category || null);
    }
    if (profileData.language !== undefined) {
      updateFields.push(`language = $${paramIndex++}`);
      values.push(profileData.language || 'en');
    }
    if (profileData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(profileData.email || null);
    }
    if (profileData.state !== undefined) {
      updateFields.push(`state = $${paramIndex++}`);
      values.push(profileData.state || null);
    }
    if (profileData.district !== undefined) {
      updateFields.push(`district = $${paramIndex++}`);
      values.push(profileData.district || null);
    }
    if (profileData.tahsil !== undefined) {
      updateFields.push(`tahsil = $${paramIndex++}`);
      values.push(profileData.tahsil || null);
    }
    if (profileData.designation !== undefined) {
      updateFields.push(`designation = $${paramIndex++}`);
      values.push(profileData.designation || null);
    }
    if (profileData.political_party !== undefined) {
      updateFields.push(`political_party = $${paramIndex++}`);
      values.push(profileData.political_party || null);
    }
    if (profileData.profile_photo_url !== undefined) {
      updateFields.push(`profile_photo_url = $${paramIndex++}`);
      values.push(profileData.profile_photo_url || null);
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    // Only set profile_complete to true if it's a new profile completion
    // For edits, keep the existing profile_complete status
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(userId);
    const whereClause = `WHERE id = $${paramIndex}`;

    const query = `UPDATE profiles
       SET ${updateFields.join(', ')}
       ${whereClause}
       RETURNING *`;

    console.log('Executing query:', query);
    console.log('With values:', values);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      console.log('Profile update failed: User not found');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await syncProfileCompleteIfEligible(result.rows[0]);

    console.log('Profile updated successfully:', {
      userId: user.id,
      first_name: user.first_name,
      email: user.email,
      state: user.state,
      profile_complete: user.profile_complete,
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get User Profile
app.get('/api/auth/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await syncProfileCompleteIfEligible(result.rows[0]);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function profilePhotoResponsePayload(row) {
  const url = row.profile_photo_url;
  return {
    success: true,
    profile_photo_url: url,
    user: row,
  };
}

// Multipart profile photo (e.g. web FormData: photo + userId)
app.post('/api/auth/upload-profile-photo', profilePhotoUpload.single('photo'), async (req, res) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    if (!userId) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'photo file required' });
    }

    const relUrl = `/uploads/profiles/${req.file.filename}`;
    const result = await pool.query(
      `UPDATE profiles SET profile_photo_url = $1, updated_at = NOW() WHERE id::text = $2 OR id = $2::uuid RETURNING *`,
      [relUrl, userId]
    );

    if (result.rows.length === 0) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json(profilePhotoResponsePayload(result.rows[0]));
  } catch (error) {
    console.error('upload-profile-photo error:', error);
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

// Base64 profile photo (React Native app)
app.post('/api/auth/upload-profile-photo-base64', async (req, res) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    const photo = req.body?.photo;
    const mimeType = String(req.body?.mimeType || 'image/jpeg');

    if (!userId || !photo || typeof photo !== 'string') {
      return res.status(400).json({ success: false, error: 'userId and photo (base64) required' });
    }

    const base64 = photo.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
      return res.status(400).json({ success: false, error: 'Invalid base64 data' });
    }

    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('webp')) ext = '.webp';

    const safeUid = userId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
    const diskName = `profile-${safeUid}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const diskPath = path.join(profilesUploadDir, diskName);

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image too large or empty' });
    }

    const magic = buffer.slice(0, 12);
    const isPng = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4e && magic[3] === 0x47;
    const isJpeg = magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff;
    const isGif = magic[0] === 0x47 && magic[1] === 0x49 && magic[2] === 0x46;
    const isWebp = magic.slice(8, 12).toString() === 'WEBP';
    if (!isPng && !isJpeg && !isGif && !isWebp) {
      return res.status(400).json({ success: false, error: 'File is not a supported image type' });
    }

    fs.writeFileSync(diskPath, buffer);

    const relUrl = `/uploads/profiles/${diskName}`;
    const result = await pool.query(
      `UPDATE profiles SET profile_photo_url = $1, updated_at = NOW() WHERE id::text = $2 OR id = $2::uuid RETURNING *`,
      [relUrl, userId]
    );

    if (result.rows.length === 0) {
      fs.unlink(diskPath, () => {});
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json(profilePhotoResponsePayload(result.rows[0]));
  } catch (error) {
    console.error('upload-profile-photo-base64 error:', error);
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

// ==================== ADMIN WORKSPACE AUTH ====================

app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE username = $1', [String(username).trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { sub: user.id, role: user.role, username: user.username },
      ADMIN_JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, ADMIN_JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    const { rows } = await pool.query(
      'SELECT id, username, email, name, role FROM admin_users WHERE id = $1',
      [payload.sub]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Admin me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Dashboard overview (month selector)
app.get('/api/admin/stats/overview', async (req, res) => {
  try {
    const now = new Date();
    const year = Math.max(
      2000,
      parseInt(String(req.query.year || now.getUTCFullYear()), 10) || now.getUTCFullYear()
    );
    const month = Math.min(
      12,
      Math.max(1, parseInt(String(req.query.month || now.getUTCMonth() + 1), 10) || now.getUTCMonth() + 1)
    );
    const startThis = new Date(Date.UTC(year, month - 1, 1));
    const endThis = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    const startPrev = new Date(Date.UTC(prevY, prevM - 1, 1));
    const endPrev = new Date(Date.UTC(prevY, prevM, 0, 23, 59, 59, 999));

    const totalUsersQ = await pool.query(`SELECT COUNT(*)::int AS n FROM profiles`);
    const newThisQ = await pool.query(
      `SELECT COUNT(*)::int AS n FROM profiles WHERE created_at >= $1 AND created_at <= $2`,
      [startThis, endThis]
    );
    const newPrevQ = await pool.query(
      `SELECT COUNT(*)::int AS n FROM profiles WHERE created_at >= $1 AND created_at <= $2`,
      [startPrev, endPrev]
    );
    const newThis = newThisQ.rows[0].n;
    const newPrev = newPrevQ.rows[0].n;
    const userChangePct =
      newPrev > 0 ? Math.round(((newThis - newPrev) / newPrev) * 100) : newThis > 0 ? 100 : 0;

    const activeT = await pool.query(`SELECT COUNT(*)::int AS n FROM templates WHERE status = 'active'`);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let upd24 = { rows: [{ n: 0 }] };
    try {
      upd24 = await pool.query(
        `SELECT COUNT(*)::int AS n FROM templates WHERE COALESCE(updated_at, created_at) >= $1`,
        [dayAgo]
      );
    } catch {
      upd24 = await pool.query(`SELECT COUNT(*)::int AS n FROM templates WHERE created_at >= $1`, [dayAgo]);
    }
    const tplThisQ = await pool.query(
      `SELECT COUNT(*)::int AS n FROM templates WHERE created_at >= $1 AND created_at <= $2`,
      [startThis, endThis]
    );
    const tplPrevQ = await pool.query(
      `SELECT COUNT(*)::int AS n FROM templates WHERE created_at >= $1 AND created_at <= $2`,
      [startPrev, endPrev]
    );
    const tplThis = tplThisQ.rows[0].n;
    const tplPrev = tplPrevQ.rows[0].n;
    const tplChangePct =
      tplPrev > 0 ? Math.round(((tplThis - tplPrev) / tplPrev) * 100) : tplThis > 0 ? 100 : 0;

    const byDay = await pool.query(
      `SELECT EXTRACT(DAY FROM created_at AT TIME ZONE 'UTC')::int AS dom, COUNT(*)::int AS n
         FROM profiles
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY 1 ORDER BY 1`,
      [startThis, endThis]
    );
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dayMap = Object.fromEntries(byDay.rows.map((r) => [r.dom, r.n]));
    const labels = [];
    const values = [];
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(String(d));
      values.push(dayMap[d] || 0);
    }
    const chartMax = Math.max(...values, 1);

    res.json({
      success: true,
      data: {
        period: {
          year,
          month,
          start: startThis.toISOString().slice(0, 10),
          end: endThis.toISOString().slice(0, 10),
        },
        users: {
          total: totalUsersQ.rows[0].n,
          new_this_month: newThis,
          new_prev_month: newPrev,
          change_pct: userChangePct,
        },
        mrr: {
          amount: 0,
          currency: 'INR',
          revenue_this_month: 0,
          revenue_prev_month: 0,
          change_pct: 0,
        },
        templates: {
          active: activeT.rows[0].n,
          updated_last_24h: upd24.rows[0].n,
          new_this_month: tplThis,
          new_prev_month: tplPrev,
          change_pct: tplChangePct,
        },
        chart: {
          title: 'New users per day',
          labels,
          values,
          max: chartMax,
          unit: 'users',
        },
      },
    });
  } catch (error) {
    console.error('admin stats overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User list (admin)
app.get('/api/admin/users', async (req, res) => {
  try {
    const conditions = [];
    const params = [];
    let p = 1;

    const profileComplete = req.query.profile_complete;
    if (profileComplete === 'true') {
      conditions.push('COALESCE(profile_complete, false) = true');
    } else if (profileComplete === 'false') {
      conditions.push('COALESCE(profile_complete, false) = false');
    }

    if (req.query.language && String(req.query.language).trim()) {
      conditions.push(`LOWER(TRIM(COALESCE(language, ''))) = LOWER($${p++})`);
      params.push(String(req.query.language).trim());
    }
    if (req.query.state && String(req.query.state).trim()) {
      conditions.push(`state = $${p++}`);
      params.push(String(req.query.state).trim());
    }
    if (req.query.district && String(req.query.district).trim()) {
      conditions.push(`district = $${p++}`);
      params.push(String(req.query.district).trim());
    }
    if (req.query.tahsil && String(req.query.tahsil).trim()) {
      conditions.push(`tahsil = $${p++}`);
      params.push(String(req.query.tahsil).trim());
    }
    if (req.query.designation && String(req.query.designation).trim()) {
      conditions.push(`COALESCE(designation, '') ILIKE $${p++}`);
      params.push(`%${String(req.query.designation).trim()}%`);
    }
    if (req.query.political_party && String(req.query.political_party).trim()) {
      conditions.push(`COALESCE(political_party, '') ILIKE $${p++}`);
      params.push(`%${String(req.query.political_party).trim()}%`);
    }
    if (req.query.category && String(req.query.category).trim()) {
      conditions.push(`COALESCE(category, '') ILIKE $${p++}`);
      params.push(`%${String(req.query.category).trim()}%`);
    }
    if (req.query.search && String(req.query.search).trim()) {
      const sp = `%${String(req.query.search).trim()}%`;
      conditions.push(`(
        COALESCE(phone_number::text, '') ILIKE $${p} OR
        COALESCE(first_name, '') ILIKE $${p} OR
        COALESCE(middle_name, '') ILIKE $${p} OR
        COALESCE(last_name, '') ILIKE $${p} OR
        COALESCE(email, '') ILIKE $${p} OR
        COALESCE(alternate_phone::text, '') ILIKE $${p}
      )`);
      params.push(sp);
      p++;
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM profiles ${whereSql}`,
      params
    );
    const total = countRows[0].n;

    const listParams = [...params, limit, offset];
    const limP = p;
    const offP = p + 1;
    const { rows } = await pool.query(
      `SELECT id, phone_number, first_name, middle_name, last_name, title, alternate_phone, category, language, email, state, district, tahsil, designation, political_party, profile_complete, profile_photo_url, created_at, updated_at
         FROM profiles
         ${whereSql}
        ORDER BY created_at DESC NULLS LAST
        LIMIT $${limP} OFFSET $${offP}`,
      listParams
    );

    res.json({ success: true, data: rows, total });
  } catch (error) {
    console.error('admin GET /users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/notifications', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, data, language, state, district, tahsil, created_at
         FROM notification_broadcasts
        ORDER BY created_at DESC
        LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('admin GET /notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/suggestions', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.user_id, s.subject, s.body, s.created_at,
              p.phone_number,
              TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) AS user_display_name
         FROM user_suggestions s
         LEFT JOIN profiles p ON p.id = s.user_id
        ORDER BY s.created_at DESC
        LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('admin GET /suggestions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/notifications', async (req, res) => {
  try {
    const title = req.body.title != null ? String(req.body.title).trim() : '';
    const bodyText = req.body.body != null ? String(req.body.body).trim() : '';
    if (!title || !bodyText) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }
    let dataPayload =
      req.body.data != null && typeof req.body.data === 'object' && !Array.isArray(req.body.data)
        ? { ...req.body.data }
        : {};
    const categorySlugRaw =
      req.body.category_slug != null && String(req.body.category_slug).trim()
        ? String(req.body.category_slug).trim()
        : '';
    if (categorySlugRaw) {
      dataPayload.category_slug = categorySlugRaw;
      dataPayload.action = 'open_category';
    }
    const langF =
      req.body.language != null && String(req.body.language).trim()
        ? String(req.body.language).trim()
        : null;
    const stateF =
      req.body.state != null && String(req.body.state).trim() ? String(req.body.state).trim() : null;
    const districtF =
      req.body.district != null && String(req.body.district).trim()
        ? String(req.body.district).trim()
        : null;
    const tahsilF =
      req.body.tahsil != null && String(req.body.tahsil).trim() ? String(req.body.tahsil).trim() : null;

    const insBroadcast = await pool.query(
      `INSERT INTO notification_broadcasts (title, body, data, language, state, district, tahsil, recipient_count)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, 0)
       RETURNING id`,
      [title, bodyText, JSON.stringify(dataPayload), langF, stateF, districtF, tahsilF]
    );

    const insertNotif = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data, is_read)
       SELECT id, 'broadcast', $1, $2, $3::jsonb, false
         FROM profiles
        WHERE COALESCE(profile_complete, false) = true
          AND ($4::text IS NULL OR COALESCE(language, '') = $4)
          AND ($5::text IS NULL OR COALESCE(state, '') = $5)
          AND ($6::text IS NULL OR COALESCE(district, '') = $6)
          AND ($7::text IS NULL OR COALESCE(tahsil, '') = $7)`,
      [title, bodyText, JSON.stringify(dataPayload), langF, stateF, districtF, tahsilF]
    );
    const recipientCount = insertNotif.rowCount || 0;

    await pool.query(`UPDATE notification_broadcasts SET recipient_count = $1 WHERE id = $2`, [
      recipientCount,
      insBroadcast.rows[0].id,
    ]);

    const { rows: tokenRows } = await pool.query(
      `SELECT DISTINCT dt.token
         FROM device_tokens dt
         INNER JOIN profiles p ON p.id = dt.user_id
        WHERE dt.is_active = true
          AND COALESCE(p.profile_complete, false) = true
          AND ($1::text IS NULL OR COALESCE(p.language, '') = $1)
          AND ($2::text IS NULL OR COALESCE(p.state, '') = $2)
          AND ($3::text IS NULL OR COALESCE(p.district, '') = $3)
          AND ($4::text IS NULL OR COALESCE(p.tahsil, '') = $4)`,
      [langF, stateF, districtF, tahsilF]
    );
    const tokens = tokenRows.map((r) => r.token).filter(Boolean);
    const messaging = getFirebaseMessaging();
    let pushAttempted = 0;
    let pushFailures = 0;
    if (messaging && tokens.length > 0) {
      const dataStrings = {};
      try {
        for (const [k, v] of Object.entries(dataPayload)) {
          dataStrings[String(k)] = v == null ? '' : String(v);
        }
      } catch {
        /* ignore */
      }
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        pushAttempted += chunk.length;
        try {
          const resp = await messaging.sendEachForMulticast({
            tokens: chunk,
            notification: { title, body: bodyText },
            data: dataStrings,
          });
          pushFailures += resp.failureCount || 0;
        } catch (err) {
          console.error('FCM multicast error', err);
          pushFailures += chunk.length;
        }
      }
    }

    res.json({
      success: true,
      broadcastId: insBroadcast.rows[0].id,
      recipientCount,
      push: { attempted: pushAttempted, failures: pushFailures },
    });
  } catch (error) {
    console.error('admin POST /notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/home-carousel-slides', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id::text AS id, image_url, sort_order, is_active, created_at
         FROM home_carousel_slides
        ORDER BY sort_order ASC, created_at ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('admin GET /home-carousel-slides error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/home-carousel-slides', carouselUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required (field name: file)' });
    }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS n FROM home_carousel_slides`);
    if (countRows[0].n >= 3) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, error: 'Maximum 3 carousel images allowed' });
    }
    const imageUrl = `/uploads/carousel/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO home_carousel_slides (image_url, sort_order, is_active)
       VALUES ($1, $2, true)
       RETURNING id::text AS id, image_url, sort_order, is_active, created_at`,
      [imageUrl, countRows[0].n]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    console.error('admin POST /home-carousel-slides error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/home-carousel-slides/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const { sort_order, is_active } = req.body || {};
    const updates = [];
    const vals = [];
    let pi = 1;
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${pi++}`);
      vals.push(parseInt(String(sort_order), 10) || 0);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${pi++}`);
      vals.push(Boolean(is_active));
    }
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE home_carousel_slides SET ${updates.join(', ')} WHERE id::text = $${pi} RETURNING id::text AS id, image_url, sort_order, is_active`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Slide not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('admin PUT /home-carousel-slides/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/home-carousel-slides/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const sel = await pool.query(`SELECT image_url FROM home_carousel_slides WHERE id::text = $1`, [id]);
    if (!sel.rows.length) return res.status(404).json({ success: false, error: 'Slide not found' });
    await pool.query(`DELETE FROM home_carousel_slides WHERE id::text = $1`, [id]);
    const url = sel.rows[0].image_url;
    if (url && url.startsWith('/uploads/carousel/')) {
      const fp = path.join(__dirname, url.replace(/^\//, ''));
      fs.unlink(fp, () => {});
    }
    res.json({ success: true });
  } catch (error) {
    console.error('admin DELETE /home-carousel-slides/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/political-parties', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, short_name, logo_url, color, is_active, is_national
         FROM political_parties
        ORDER BY is_national DESC, name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('admin GET /political-parties error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/political-parties/:id/logo', partyLogoUpload.single('file'), async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(partyId)) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, error: 'Invalid party id' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required (field name: file)' });
    }
    const logoUrl = `/uploads/political-logos/${req.file.filename}`;
    const { rows } = await pool.query(
      `UPDATE political_parties SET logo_url = $1 WHERE id = $2 RETURNING id, name, short_name, logo_url`,
      [logoUrl, partyId]
    );
    if (!rows.length) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, error: 'Party not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    console.error('admin POST /political-parties/:id/logo error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get All Categories
app.get('/api/admin/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, description, icon, color, is_active, sort_order, created_at, updated_at FROM categories ORDER BY sort_order, name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Category
app.post('/api/admin/categories', async (req, res) => {
  try {
    const { name, slug, description, icon, color, is_active, sort_order } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Name and slug are required' });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, icon, color, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, description || null, icon || null, color || 'blue', is_active !== false, sort_order || 0]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ success: false, error: 'Category with this name or slug already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Category
app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, color, is_active, sort_order } = req.body;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (slug !== undefined) {
      updateFields.push(`slug = $${paramIndex++}`);
      values.push(slug);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (icon !== undefined) {
      updateFields.push(`icon = $${paramIndex++}`);
      values.push(icon || null);
    }
    if (color !== undefined) {
      updateFields.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex++}`);
      values.push(sort_order);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Category with this name or slug already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Category
app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TEMPLATE ROUTES ====================

// Create Template (with file upload)
app.post('/api/admin/templates', upload.single('file'), async (req, res) => {
  try {
    const { name, category_slug, description, file_format, aspect_ratio } = req.body;

    if (!name || !category_slug || !file_format || !aspect_ratio) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'Name, category, file format, and aspect ratio are required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File is required' });
    }

    // Verify category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE slug = $1 AND is_active = true', [category_slug]);
    if (categoryCheck.rows.length === 0) {
      // Delete uploaded file if category doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid or inactive category' });
    }

    // Construct file URL (relative to uploads directory)
    const fileUrl = `/uploads/templates/${req.file.filename}`;

    // Insert template into database
    const result = await pool.query(
      `INSERT INTO templates (name, category_slug, description, file_format, aspect_ratio, file_url, file_name, file_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        category_slug,
        description || null,
        file_format,
        aspect_ratio,
        fileUrl,
        req.file.originalname,
        req.file.size,
        'draft' // Default to draft status
      ]
    );

    console.log('Template created successfully:', result.rows[0].id);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create template error:', error);
    // Delete uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get All Templates
app.get('/api/admin/templates', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    
    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM templates t
      LEFT JOIN categories c ON t.category_slug = c.slug
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      query += ` AND t.category_slug = $${paramIndex++}`;
      params.push(category);
    }

    if (status && status !== 'all') {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Single Template
app.get('/api/admin/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
       FROM templates t
       LEFT JOIN categories c ON t.category_slug = c.slug
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Template
app.put('/api/admin/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_slug, description, file_format, aspect_ratio, status } = req.body;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (category_slug !== undefined) {
      updateFields.push(`category_slug = $${paramIndex++}`);
      values.push(category_slug);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (file_format !== undefined) {
      updateFields.push(`file_format = $${paramIndex++}`);
      values.push(file_format);
    }
    if (aspect_ratio !== undefined) {
      updateFields.push(`aspect_ratio = $${paramIndex++}`);
      values.push(aspect_ratio);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const query = `UPDATE templates SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Template
app.delete('/api/admin/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get template to delete file
    const template = await pool.query('SELECT file_url FROM templates WHERE id = $1', [id]);
    
    if (template.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Delete file from filesystem
    if (template.rows[0].file_url) {
      const filePath = path.join(__dirname, template.rows[0].file_url);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await pool.query('DELETE FROM templates WHERE id = $1', [id]);

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TEMPLATE ROUTES ====================

// Create Template (with file upload)
app.post('/api/admin/templates', upload.single('file'), async (req, res) => {
  try {
    const { name, category_slug, description, file_format, aspect_ratio } = req.body;

    if (!name || !category_slug || !file_format || !aspect_ratio) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'Name, category, file format, and aspect ratio are required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File is required' });
    }

    // Verify category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE slug = $1 AND is_active = true', [category_slug]);
    if (categoryCheck.rows.length === 0) {
      // Delete uploaded file if category doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid or inactive category' });
    }

    // Construct file URL (relative to uploads directory)
    const fileUrl = `/uploads/templates/${req.file.filename}`;

    // Insert template into database
    const result = await pool.query(
      `INSERT INTO templates (name, category_slug, description, file_format, aspect_ratio, file_url, file_name, file_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        category_slug,
        description || null,
        file_format,
        aspect_ratio,
        fileUrl,
        req.file.originalname,
        req.file.size,
        'draft' // Default to draft status
      ]
    );

    console.log('Template created successfully:', result.rows[0].id);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create template error:', error);
    // Delete uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get All Templates
app.get('/api/admin/templates', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    
    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM templates t
      LEFT JOIN categories c ON t.category_slug = c.slug
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      query += ` AND t.category_slug = $${paramIndex++}`;
      params.push(category);
    }

    if (status && status !== 'all') {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chitrakal API is running' });
});

// Export app for Vercel serverless functions
module.exports = app;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 API endpoints available at http://localhost:${PORT}/api`);
  });
}

