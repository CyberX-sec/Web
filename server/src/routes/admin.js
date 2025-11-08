const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { run, get, all } = require('../db');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');

const router = express.Router();

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'on', 'yes'].includes(value.toLowerCase());
  }
  return Boolean(value);
};

const nullable = (value) => (value === undefined || value === null || value === '' ? null : value);

const ROLE_OPTIONS = ['super-admin', 'admin', 'editor'];

const parseListField = (value) => {
  if (!value) {
    return [];
  }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch (error) {
    // Ignore parsing issues and fall back to an empty array
  }
  if (typeof value === 'string') {
    return String(value)
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const serializeListField = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  let items = value;
  if (typeof items === 'string') {
    items = items
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(items)) {
    return null;
  }

  const filtered = items.map((entry) => String(entry).trim()).filter(Boolean);
  if (!filtered.length) {
    return null;
  }

  return JSON.stringify(filtered);
};

const normalizeSlug = (value) => {
  if (!value) {
    return '';
  }
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const sanitizeUser = (row) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  avatarUrl: row.avatar_url,
  bio: row.bio,
  badges: parseListField(row.badges),
  certificates: parseListField(row.certificates),
  profileSlug: row.profile_slug || null,
  profileHeadline: row.profile_headline || '',
  profileVisible: Number(row.profile_visible) === 1,
  profileHeroImage: row.profile_hero_image || '',
  profileContactLinks: parseListField(row.profile_contact_links),
  profilePosition: typeof row.profile_position === 'number' ? row.profile_position : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizeProfile = (row) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  avatarUrl: row.avatar_url,
  bio: row.bio || '',
  badges: parseListField(row.badges),
  certificates: parseListField(row.certificates),
  profileSlug: row.profile_slug || null,
  profileHeadline: row.profile_headline || '',
  profileVisible: Number(row.profile_visible) === 1,
  profileHeroImage: row.profile_hero_image || '',
  profileContactLinks: parseListField(row.profile_contact_links),
  profilePosition: typeof row.profile_position === 'number' ? row.profile_position : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizeChannel = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || '',
  heroTitle: row.hero_title || '',
  heroSubtitle: row.hero_subtitle || '',
  coverImage: row.cover_image || '',
  badges: parseListField(row.badges),
  certificates: parseListField(row.certificates),
  ownerId: row.owner_id,
  ownerName: row.owner_name || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizeLectureAdmin = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  coverImage: row.cover_image || '',
  videoUrl: row.video_url || '',
  resourceUrl: row.resource_url || '',
  category: row.category || '',
  channelId: row.channel_id,
  channelName: row.channel_name || '',
  channelSlug: row.channel_slug || '',
  position: row.position,
  isPublished: row.is_published,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizeTeamMemberAdmin = (row) => ({
  id: row.id,
  displayName: row.display_name,
  email: row.email,
  avatarUrl: row.avatar_url || '',
  profileSlug: row.profile_slug || null,
  profileHeadline: row.profile_headline || '',
  profileVisible: Number(row.profile_visible) === 1,
  profilePosition: typeof row.profile_position === 'number' ? row.profile_position : null,
  updatedAt: row.updated_at,
});

const sanitizeActivityLog = (row) => {
  let details = null;
  if (row && row.details) {
    try {
      details = JSON.parse(row.details);
    } catch (error) {
      details = null;
    }
  }

  const actor = details && details.actor ? details.actor : null;

  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    details,
    createdAt: row.created_at,
    userDisplayName: row.user_display_name || (actor && actor.displayName) || null,
    userEmail: row.user_email || (actor && actor.email) || null,
    userRole: row.user_role || (actor && actor.role ? actor.role : null),
  };
};

const SITE_SETTING_KEYS = new Set([
  'home.heroImage',
  'home.heroTitle',
  'home.heroLineAr',
  'home.heroLineEn',
  'contact.email',
  'contact.github',
  'contact.telegram',
  'home.about.heading',
  'home.about.textAr',
  'home.about.textEn',
  'home.vision.heading',
  'home.vision.textAr',
  'home.vision.textEn',
  'home.sections.order',
  'home.sections.projects.title',
  'home.sections.projects.viewAllTitle',
  'home.sections.projects.viewAllCta',
  'home.sections.projects.viewAllLink',
  'home.sections.lectures.title',
  'home.sections.lectures.viewAllTitle',
  'home.sections.lectures.viewAllCta',
  'home.sections.lectures.viewAllLink',
  'home.sections.articles.title',
  'home.sections.articles.viewAllTitle',
  'home.sections.articles.viewAllCta',
  'home.sections.articles.viewAllLink',
]);
const DEFAULT_UPLOAD_FOLDER = 'general';

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const uploadRoot = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.resolve(projectRoot, 'media', 'uploads');

fs.mkdirSync(uploadRoot, { recursive: true });

function sanitizeUploadFolder(value) {
  const base = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || DEFAULT_UPLOAD_FOLDER;
}

function sanitizeFilename(value) {
  const base = String(value || 'upload')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return base || 'upload';
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const folderInput = req.body.folder || req.query.folder || DEFAULT_UPLOAD_FOLDER;
      const subDir = sanitizeUploadFolder(folderInput);
      const target = path.join(uploadRoot, subDir);
      fs.mkdirSync(target, { recursive: true });
      req._uploadSubDir = subDir;
      cb(null, target);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    try {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.dat';
      const baseName = sanitizeFilename(path.basename(file.originalname || 'upload', ext)).slice(0, 60);
      const timestamp = Date.now();
      const finalName = `${baseName}-${timestamp}${ext}`;
      req._uploadFileName = finalName;
      cb(null, finalName);
    } catch (error) {
      cb(error);
    }
  },
});

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

async function recordActivity(user, action, resource, resourceId, details = {}) {
  if (!user || !user.id || !action || !resource) {
    return;
  }

  const payload = {
    ...details,
  };

  if (!payload.actor) {
    payload.actor = {
      id: user.id,
      role: user.role,
      displayName: user.displayName || user.email || `User #${user.id}`,
      email: user.email || null,
    };
  }

  let serialized = null;
  try {
    serialized = JSON.stringify(payload);
  } catch (error) {
    serialized = null;
  }

  try {
    await run(
      `INSERT INTO activity_logs (user_id, action, resource, resource_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, action, resource, resourceId ? String(resourceId) : null, serialized]
    );
  } catch (error) {
    console.error('Failed to record activity', error);
  }
}

function uploadFileFilter(req, file, cb) {
  if (!allowedImageTypes.has(file.mimetype)) {
    cb(new Error('نوع الملف غير مدعوم. الرجاء رفع صورة.'));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: uploadFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

async function loadSiteSettings() {
  const rows = await all('SELECT key, value FROM site_settings');
  const settings = {};
  rows.forEach((row) => {
    if (!SITE_SETTING_KEYS.has(row.key)) {
      return;
    }
    if (row.value !== null && row.value !== undefined && row.value !== '') {
      settings[row.key] = row.value;
    }
  });
  return settings;
}

async function persistSiteSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return loadSiteSettings();
  }

  const entries = Object.entries(settings).filter(([key]) => SITE_SETTING_KEYS.has(key));

  await Promise.all(
    entries.map(async ([key, value]) => {
      const normalized = nullable(value);
      if (normalized === null) {
        await run('DELETE FROM site_settings WHERE key = ?', [key]);
        return;
      }

      await run(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, normalized]
      );
    })
  );

  return loadSiteSettings();
}

const isValidRole = (role) => ROLE_OPTIONS.includes(role);

async function countSuperAdmins() {
  const row = await get('SELECT COUNT(*) AS total FROM users WHERE role = ?', ['super-admin']);
  return row ? Number(row.total) : 0;
}

const isSuperAdminUser = (user) => user && user.role === 'super-admin';

async function getChannelOwnerId(channelId) {
  if (!channelId) {
    return null;
  }
  const channel = await get('SELECT owner_id FROM channels WHERE id = ?', [channelId]);
  return channel ? channel.owner_id : null;
}

async function ensureChannelPermission(channelId, user) {
  if (!channelId) {
    throw new Error('Channel is required');
  }

  if (isSuperAdminUser(user)) {
    return;
  }

  const ownerId = await getChannelOwnerId(channelId);
  if (!ownerId) {
    throw new Error('Channel not found');
  }

  if (ownerId !== user.id) {
    const error = new Error('FORBIDDEN_CHANNEL');
    error.code = 'FORBIDDEN_CHANNEL';
    throw error;
  }
}

async function loadChannelById(id) {
  return get(
    `SELECT channels.*, users.display_name AS owner_name
       FROM channels
       LEFT JOIN users ON users.id = channels.owner_id
      WHERE channels.id = ?`,
    [id]
  );
}

async function loadLectureById(id) {
  return get(
    `SELECT lectures.*, channels.owner_id AS channel_owner_id, channels.name AS channel_name, channels.slug AS channel_slug
       FROM lectures
       LEFT JOIN channels ON channels.id = lectures.channel_id
      WHERE lectures.id = ?`,
    [id]
  );
}

router.post('/uploads', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      console.error('Failed to upload file', error);
      res.status(400).json({ error: error.message || 'تعذر رفع الملف.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'لم يتم اختيار ملف.' });
      return;
    }
    const subDir = req._uploadSubDir || DEFAULT_UPLOAD_FOLDER;
    const publicUrl = `/media/uploads/${subDir}/${req.file.filename}`.split('\\').join('/');

    res.status(201).json({
      url: publicUrl,
      path: publicUrl,
      folder: subDir,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  });
});

router.get('/site-settings', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  try {
    const settings = await loadSiteSettings();
    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch site settings', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

router.put('/site-settings', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  try {
    const incoming = req.body || {};
    const nextSettings = {};

    const fieldMap = {
      homeHeroImage: 'home.heroImage',
      'home.heroImage': 'home.heroImage',
      homeHeroTitle: 'home.heroTitle',
      'home.heroTitle': 'home.heroTitle',
      homeHeroLineAr: 'home.heroLineAr',
      'home.heroLineAr': 'home.heroLineAr',
      homeHeroLineEn: 'home.heroLineEn',
      'home.heroLineEn': 'home.heroLineEn',
      contactEmail: 'contact.email',
      'contact.email': 'contact.email',
      contactGithub: 'contact.github',
      'contact.github': 'contact.github',
      contactTelegram: 'contact.telegram',
      'contact.telegram': 'contact.telegram',
  homeAboutHeading: 'home.about.heading',
  'home.about.heading': 'home.about.heading',
  homeAboutTextAr: 'home.about.textAr',
  'home.about.textAr': 'home.about.textAr',
  homeAboutTextEn: 'home.about.textEn',
  'home.about.textEn': 'home.about.textEn',
  homeVisionHeading: 'home.vision.heading',
  'home.vision.heading': 'home.vision.heading',
  homeVisionTextAr: 'home.vision.textAr',
  'home.vision.textAr': 'home.vision.textAr',
  homeVisionTextEn: 'home.vision.textEn',
  'home.vision.textEn': 'home.vision.textEn',
      homeSectionsOrder: 'home.sections.order',
      'home.sections.order': 'home.sections.order',
      projectsSectionTitle: 'home.sections.projects.title',
      'home.sections.projects.title': 'home.sections.projects.title',
      projectsSectionViewAllTitle: 'home.sections.projects.viewAllTitle',
      'home.sections.projects.viewAllTitle': 'home.sections.projects.viewAllTitle',
      projectsSectionViewAllCta: 'home.sections.projects.viewAllCta',
      'home.sections.projects.viewAllCta': 'home.sections.projects.viewAllCta',
      projectsSectionViewAllLink: 'home.sections.projects.viewAllLink',
      'home.sections.projects.viewAllLink': 'home.sections.projects.viewAllLink',
      lecturesSectionTitle: 'home.sections.lectures.title',
      'home.sections.lectures.title': 'home.sections.lectures.title',
      lecturesSectionViewAllTitle: 'home.sections.lectures.viewAllTitle',
      'home.sections.lectures.viewAllTitle': 'home.sections.lectures.viewAllTitle',
      lecturesSectionViewAllCta: 'home.sections.lectures.viewAllCta',
      'home.sections.lectures.viewAllCta': 'home.sections.lectures.viewAllCta',
      lecturesSectionViewAllLink: 'home.sections.lectures.viewAllLink',
      'home.sections.lectures.viewAllLink': 'home.sections.lectures.viewAllLink',
      articlesSectionTitle: 'home.sections.articles.title',
      'home.sections.articles.title': 'home.sections.articles.title',
      articlesSectionViewAllTitle: 'home.sections.articles.viewAllTitle',
      'home.sections.articles.viewAllTitle': 'home.sections.articles.viewAllTitle',
      articlesSectionViewAllCta: 'home.sections.articles.viewAllCta',
      'home.sections.articles.viewAllCta': 'home.sections.articles.viewAllCta',
      articlesSectionViewAllLink: 'home.sections.articles.viewAllLink',
      'home.sections.articles.viewAllLink': 'home.sections.articles.viewAllLink',
    };

    Object.entries(fieldMap).forEach(([inputKey, settingKey]) => {
      if (!Object.prototype.hasOwnProperty.call(incoming, inputKey)) {
        return;
      }
      let value = incoming[inputKey];
      if (settingKey === 'home.sections.order') {
        if (Array.isArray(value)) {
          value = value.filter(Boolean);
          value = value.length ? JSON.stringify(value) : null;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          value = trimmed ? trimmed : null;
        } else {
          value = null;
        }
      }
      nextSettings[settingKey] = value;
    });

    const settings = await persistSiteSettings(nextSettings);
    const changedKeys = Object.keys(nextSettings);
    await recordActivity(req.session.user, 'update', 'site_settings', null, {
      summary: `Updated site settings: ${changedKeys.length ? changedKeys.join(', ') : 'no changes detected'}`,
      keys: changedKeys,
    });
    res.json(settings);
  } catch (error) {
    console.error('Failed to update site settings', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

router.get('/activity', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  try {
    const rows = await all(
      `SELECT logs.*, users.display_name AS user_display_name, users.email AS user_email, users.role AS user_role
         FROM activity_logs AS logs
         LEFT JOIN users ON users.id = logs.user_id
        ORDER BY logs.created_at DESC
        LIMIT ?`,
      [limit]
    );

    res.json(rows.map(sanitizeActivityLog));
  } catch (error) {
    console.error('Failed to fetch activity log', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const profile = sanitizeProfile(user);

    req.session.user = {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      badges: profile.badges,
      certificates: profile.certificates,
      profileSlug: profile.profileSlug,
      profileHeadline: profile.profileHeadline,
      profileVisible: profile.profileVisible,
      profileHeroImage: profile.profileHeroImage,
      profileContactLinks: profile.profileContactLinks,
      profilePosition: profile.profilePosition,
    };

    res.json(profile);
  } catch (error) {
    console.error('Failed to log in', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.post('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.json({ success: true });
    });
    return;
  }

  res.json({ success: true });
});

router.get('/auth/me', ensureAuthenticated, async (req, res) => {
  try {
    const row = await get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const profile = sanitizeProfile(row);
    req.session.user = {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      badges: profile.badges,
      certificates: profile.certificates,
      profileSlug: profile.profileSlug,
      profileHeadline: profile.profileHeadline,
      profileVisible: profile.profileVisible,
      profileHeroImage: profile.profileHeroImage,
      profileContactLinks: profile.profileContactLinks,
    };

    res.json(profile);
  } catch (error) {
    console.error('Failed to load profile', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/profile/me', ensureAuthenticated, async (req, res) => {
  try {
    const row = await get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(sanitizeProfile(row));
  } catch (error) {
    console.error('Failed to fetch profile', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile/me', ensureAuthenticated, async (req, res) => {
  const {
    displayName,
    avatarUrl,
    bio,
    badges,
    certificates,
    profileSlug,
    profileHeadline,
    profileVisible,
    profileHeroImage,
    profileContactLinks,
  } = req.body;

  if (displayName !== undefined && !displayName) {
    res.status(400).json({ error: 'Display name cannot be empty' });
    return;
  }

  try {
    const current = await get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const nextDisplayName = displayName !== undefined ? displayName : current.display_name;
    const nextAvatar = avatarUrl !== undefined ? avatarUrl : current.avatar_url;
    const nextBio = bio !== undefined ? bio : current.bio;
    const nextBadges = badges !== undefined ? serializeListField(badges) : current.badges;
    const nextCertificates = certificates !== undefined ? serializeListField(certificates) : current.certificates;
    const contactProvided = Object.prototype.hasOwnProperty.call(req.body, 'profileContactLinks');
    const nextContactLinks = contactProvided
      ? serializeListField(profileContactLinks)
      : current.profile_contact_links;
    const slugProvided = Object.prototype.hasOwnProperty.call(req.body, 'profileSlug');
    const normalizedSlug = slugProvided ? normalizeSlug(profileSlug) : null;
    if (slugProvided && normalizedSlug) {
      const existing = await get('SELECT id FROM users WHERE profile_slug = ? AND id != ?', [normalizedSlug, req.session.user.id]);
      if (existing) {
        res.status(400).json({ error: 'This profile slug is already in use.' });
        return;
      }
    }
    const nextSlug = slugProvided ? (normalizedSlug || null) : current.profile_slug;
    const headlineProvided = Object.prototype.hasOwnProperty.call(req.body, 'profileHeadline');
    const nextHeadline = headlineProvided
      ? (profileHeadline ? String(profileHeadline).trim() : '')
      : current.profile_headline;
    const heroImageProvided = Object.prototype.hasOwnProperty.call(req.body, 'profileHeroImage');
    const nextHeroImage = heroImageProvided
      ? nullable(profileHeroImage)
      : current.profile_hero_image;
    const visibleProvided = Object.prototype.hasOwnProperty.call(req.body, 'profileVisible');
    const nextVisible = visibleProvided
      ? parseBoolean(profileVisible)
      : Boolean(current.profile_visible);

    await run(
      `UPDATE users
          SET display_name = ?,
              avatar_url = ?,
              bio = ?,
              badges = ?,
              certificates = ?,
              profile_slug = ?,
              profile_headline = ?,
              profile_visible = ?,
              profile_hero_image = ?,
              profile_contact_links = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      [
        nextDisplayName,
        nextAvatar,
        nextBio,
        nextBadges,
        nextCertificates,
        nextSlug,
        nextHeadline,
        nextVisible ? 1 : 0,
        nextHeroImage,
        nextContactLinks,
        req.session.user.id,
      ]
    );

    const updated = await get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    const profile = sanitizeProfile(updated);
    req.session.user = {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      badges: profile.badges,
      certificates: profile.certificates,
      profileSlug: profile.profileSlug,
      profileHeadline: profile.profileHeadline,
      profileVisible: profile.profileVisible,
      profileHeroImage: profile.profileHeroImage,
      profileContactLinks: profile.profileContactLinks,
    };

    res.json(profile);
  } catch (error) {
    console.error('Failed to update profile', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/users', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  try {
    const rows = await all(
      'SELECT id, email, display_name, role, created_at, updated_at FROM users ORDER BY created_at ASC'
    );
    res.json(rows.map(sanitizeUser));
  } catch (error) {
    console.error('Failed to fetch users', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { email, password, displayName, role } = req.body;

  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'Email, password, and display name are required' });
    return;
  }

  const normalizedRole = isValidRole(role) ? role : 'admin';

  try {
    const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) {
      res.status(400).json({ error: 'A user with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await run(
      `INSERT INTO users (email, password_hash, display_name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [email, passwordHash, displayName, normalizedRole]
    );

    const created = await get(
      'SELECT id, email, display_name, role, created_at, updated_at FROM users WHERE email = ?',
      [email]
    );

    await recordActivity(req.session.user, 'create', 'user', created.id, {
      summary: `Created user "${created.display_name}" (${created.email})`,
      role: created.role,
    });

    res.status(201).json(sanitizeUser(created));
  } catch (error) {
    console.error('Failed to create user', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { id } = req.params;
  const { displayName, role, password } = req.body;

  try {
    const target = await get('SELECT * FROM users WHERE id = ?', [id]);

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const nextRole = role !== undefined ? role : target.role;
    if (role !== undefined && !isValidRole(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    if (Number(id) === req.session.user.id && nextRole !== 'super-admin') {
      res.status(400).json({ error: 'You cannot remove super-admin privileges from yourself' });
      return;
    }

    if (target.role === 'super-admin' && nextRole !== 'super-admin') {
      const totalSupers = await countSuperAdmins();
      if (totalSupers <= 1) {
        res.status(400).json({ error: 'At least one super-admin must remain' });
        return;
      }
    }

    const nextDisplayName = displayName !== undefined ? displayName : target.display_name;
    if (!nextDisplayName) {
      res.status(400).json({ error: 'Display name cannot be empty' });
      return;
    }

    let nextPasswordHash = target.password_hash;
    if (password) {
      nextPasswordHash = await bcrypt.hash(password, 12);
    }

    await run(
      `UPDATE users
          SET display_name = ?,
              role = ?,
              password_hash = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      [nextDisplayName, nextRole, nextPasswordHash, id]
    );

    const updated = await get(
      'SELECT id, email, display_name, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    const updatedFields = Object.keys(req.body || {});
    await recordActivity(req.session.user, 'update', 'user', id, {
      summary: `Updated user "${updated.display_name}"`,
      role: updated.role,
      fields: updatedFields,
    });

    if (Number(id) === req.session.user.id) {
      req.session.user.displayName = updated.display_name;
      req.session.user.role = updated.role;
    }

    await recordActivity(req.session.user, 'update', 'user', id, {
      summary: `Updated user "${updated.display_name || updated.email || id}"`,
      role: updated.role,
      fields: Object.keys(req.body || {}),
    });

    res.json(sanitizeUser(updated));
  } catch (error) {
    console.error('Failed to update user', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.session.user.id) {
    res.status(400).json({ error: 'You cannot delete your own account' });
    return;
  }

  try {
    const target = await get('SELECT id, role, email, display_name FROM users WHERE id = ?', [id]);

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target.role === 'super-admin') {
      const totalSupers = await countSuperAdmins();
      if (totalSupers <= 1) {
        res.status(400).json({ error: 'At least one super-admin must remain' });
        return;
      }
    }

    const result = await run('DELETE FROM users WHERE id = ?', [id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await recordActivity(req.session.user, 'delete', 'user', id, {
      summary: `Deleted user "${target.display_name || target.email || id}"`,
      role: target.role,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/team-profiles', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  try {
    const rows = await all(
      `SELECT id,
              email,
              display_name,
              avatar_url,
              profile_slug,
              profile_headline,
              profile_visible,
              profile_position,
              updated_at
         FROM users
        WHERE profile_slug IS NOT NULL
          AND TRIM(profile_slug) != ''
        ORDER BY
              CASE
                WHEN profile_position IS NULL THEN 999999
                ELSE profile_position
              END ASC,
              display_name COLLATE NOCASE`
    );

    res.json(rows.map(sanitizeTeamMemberAdmin));
  } catch (error) {
    console.error('Failed to fetch team profiles', error);
    res.status(500).json({ error: 'Failed to fetch team profiles' });
  }
});

router.put('/team-profiles/order', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { order } = req.body || {};

  if (!Array.isArray(order)) {
    res.status(400).json({ error: 'الرجاء إرسال ترتيب صالح.' });
    return;
  }

  const normalized = order
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  const unique = [];
  const seen = new Set();
  normalized.forEach((value) => {
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  });

  try {
    const visibleRows = await all(
      `SELECT id
         FROM users
        WHERE profile_visible = 1
          AND profile_slug IS NOT NULL
          AND TRIM(profile_slug) != ''
        ORDER BY
              CASE
                WHEN profile_position IS NULL THEN 999999
                ELSE profile_position
              END ASC,
              display_name COLLATE NOCASE`
    );

    const visibleIds = visibleRows.map((row) => row.id);
    const visibleSet = new Set(visibleIds);
    const finalOrder = [];

    unique.forEach((id) => {
      if (visibleSet.has(id)) {
        finalOrder.push(id);
        visibleSet.delete(id);
      }
    });

    visibleRows.forEach((row) => {
      if (visibleSet.has(row.id)) {
        finalOrder.push(row.id);
        visibleSet.delete(row.id);
      }
    });

    await run('BEGIN TRANSACTION');
    try {
      if (finalOrder.length) {
        let position = 1;
        for (const userId of finalOrder) {
          await run(
            `UPDATE users
                SET profile_position = ?,
                    updated_at = datetime('now')
              WHERE id = ?`,
            [position, userId]
          );
          position += 1;
        }
      } else {
        await run(
          `UPDATE users
              SET profile_position = NULL,
                  updated_at = datetime('now')
            WHERE profile_visible = 1
              AND profile_slug IS NOT NULL
              AND TRIM(profile_slug) != ''`
        );
      }

      await run(
        `UPDATE users
            SET profile_position = NULL
          WHERE (profile_visible IS NULL OR profile_visible != 1)
            AND profile_position IS NOT NULL`
      );

      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

    await recordActivity(req.session.user, 'update', 'team', 'order', {
      summary: 'Reordered team member cards',
      order: finalOrder,
    });

    const updatedRows = await all(
      `SELECT id,
              email,
              display_name,
              avatar_url,
              profile_slug,
              profile_headline,
              profile_visible,
              profile_position,
              updated_at
         FROM users
        WHERE profile_slug IS NOT NULL
          AND TRIM(profile_slug) != ''
        ORDER BY
              CASE
                WHEN profile_position IS NULL THEN 999999
                ELSE profile_position
              END ASC,
              display_name COLLATE NOCASE`
    );

    res.json(updatedRows.map(sanitizeTeamMemberAdmin));
  } catch (error) {
    console.error('Failed to reorder team profiles', error);
    res.status(500).json({ error: 'Failed to reorder team profiles' });
  }
});

router.put('/team-profiles/:id', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { id } = req.params;
  const {
    displayName,
    avatarUrl,
    bio,
    badges,
    certificates,
    profileSlug,
    profileHeadline,
    profileVisible,
    profileHeroImage,
    profileContactLinks,
    profilePosition,
  } = req.body || {};

  try {
    const current = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const payload = req.body || {};
    const nextDisplayName = Object.prototype.hasOwnProperty.call(payload, 'displayName')
      ? String(displayName || '').trim()
      : current.display_name;

    if (!nextDisplayName) {
      res.status(400).json({ error: 'Display name cannot be empty' });
      return;
    }

    let nextSlug = current.profile_slug;
    if (Object.prototype.hasOwnProperty.call(payload, 'profileSlug')) {
      const normalized = normalizeSlug(profileSlug);
      if (normalized) {
        const conflict = await get('SELECT id FROM users WHERE profile_slug = ? AND id != ?', [normalized, id]);
        if (conflict) {
          res.status(400).json({ error: 'This profile slug is already in use.' });
          return;
        }
        nextSlug = normalized;
      } else {
        nextSlug = null;
      }
    }

    const nextContactLinks = Object.prototype.hasOwnProperty.call(payload, 'profileContactLinks')
      ? serializeListField(profileContactLinks)
      : current.profile_contact_links;

    const nextBadges = Object.prototype.hasOwnProperty.call(payload, 'badges')
      ? serializeListField(badges)
      : current.badges;

    const nextCertificates = Object.prototype.hasOwnProperty.call(payload, 'certificates')
      ? serializeListField(certificates)
      : current.certificates;

    const nextVisible = Object.prototype.hasOwnProperty.call(payload, 'profileVisible')
      ? (parseBoolean(profileVisible) ? 1 : 0)
      : Number(current.profile_visible) === 1 ? 1 : 0;

    const nextHeroImage = Object.prototype.hasOwnProperty.call(payload, 'profileHeroImage')
      ? nullable(profileHeroImage)
      : current.profile_hero_image;

    const nextHeadline = Object.prototype.hasOwnProperty.call(payload, 'profileHeadline')
      ? String(profileHeadline || '').trim()
      : current.profile_headline;

    const nextBio = Object.prototype.hasOwnProperty.call(payload, 'bio') ? nullable(bio) : current.bio;
    const nextAvatar = Object.prototype.hasOwnProperty.call(payload, 'avatarUrl') ? nullable(avatarUrl) : current.avatar_url;

    let nextPosition = current.profile_position;
    if (Object.prototype.hasOwnProperty.call(payload, 'profilePosition')) {
      if (profilePosition === null || profilePosition === '' || profilePosition === undefined) {
        nextPosition = null;
      } else {
        const parsed = Number(profilePosition);
        nextPosition = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
      }
    }

    await run(
      `UPDATE users
          SET display_name = ?,
              avatar_url = ?,
              bio = ?,
              badges = ?,
              certificates = ?,
              profile_slug = ?,
              profile_headline = ?,
              profile_visible = ?,
              profile_hero_image = ?,
              profile_contact_links = ?,
              profile_position = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      [
        nextDisplayName,
        nextAvatar,
        nextBio,
        nextBadges,
        nextCertificates,
        nextSlug,
        nextHeadline,
        nextVisible,
        nextHeroImage,
        nextContactLinks,
        nextPosition,
        id,
      ]
    );

    const updated = await get('SELECT * FROM users WHERE id = ?', [id]);
    const profile = sanitizeProfile(updated);

    if (Number(id) === Number(req.session.user.id)) {
      req.session.user = {
        ...req.session.user,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        badges: profile.badges,
        certificates: profile.certificates,
        profileSlug: profile.profileSlug,
        profileHeadline: profile.profileHeadline,
        profileVisible: profile.profileVisible,
        profileHeroImage: profile.profileHeroImage,
        profileContactLinks: profile.profileContactLinks,
        profilePosition: profile.profilePosition,
      };
    }

    await recordActivity(req.session.user, 'update', 'team', id, {
      summary: `Updated team profile "${profile.displayName || profile.email || id}"`,
      fields: Object.keys(payload),
    });

    res.json(profile);
  } catch (error) {
    console.error('Failed to update team profile', error);
    res.status(500).json({ error: 'Failed to update team profile' });
  }
});

router.delete('/team-profiles/:id', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { id } = req.params;

  if (Number(id) === Number(req.session.user.id)) {
    res.status(400).json({ error: 'You cannot delete your own account through this panel.' });
    return;
  }

  try {
    const target = await get('SELECT id, role, email, display_name FROM users WHERE id = ?', [id]);

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target.role === 'super-admin') {
      const totalSupers = await countSuperAdmins();
      if (totalSupers <= 1) {
        res.status(400).json({ error: 'At least one super-admin must remain.' });
        return;
      }
    }

    const result = await run('DELETE FROM users WHERE id = ?', [id]);
    if (!result || result.changes === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await recordActivity(req.session.user, 'delete', 'team', id, {
      summary: `Deleted team member "${target.display_name || target.email || id}"`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete team profile', error);
    res.status(500).json({ error: 'Failed to delete team profile' });
  }
});

router.get('/channels', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  try {
    let rows;
    if (isSuperAdminUser(req.session.user)) {
      rows = await all(
        `SELECT channels.*, users.display_name AS owner_name
           FROM channels
           LEFT JOIN users ON users.id = channels.owner_id
          ORDER BY channels.created_at DESC`
      );
    } else {
      rows = await all(
        `SELECT channels.*, users.display_name AS owner_name
           FROM channels
           LEFT JOIN users ON users.id = channels.owner_id
          WHERE channels.owner_id = ?
          ORDER BY channels.created_at DESC`,
        [req.session.user.id]
      );
    }

    res.json(rows.map(sanitizeChannel));
  } catch (error) {
    console.error('Failed to fetch channels', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.post('/channels', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  const {
    name,
    slug,
    description,
    heroTitle,
    heroSubtitle,
    coverImage,
    ownerId,
    badges,
    certificates,
  } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: 'Name and slug are required' });
    return;
  }

  try {
    let owner = null;
    if (ownerId) {
      owner = await get('SELECT id FROM users WHERE id = ?', [ownerId]);
      if (!owner) {
        res.status(400).json({ error: 'Owner not found' });
        return;
      }
    }

    const badgesValue = serializeListField(badges);
    const certificatesValue = serializeListField(certificates);

    await run(
      `INSERT INTO channels (name, slug, description, hero_title, hero_subtitle, cover_image, owner_id, badges, certificates, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [name, slug, nullable(description), nullable(heroTitle), nullable(heroSubtitle), nullable(coverImage), owner ? owner.id : null, badgesValue, certificatesValue]
    );

    const created = await get(
      `SELECT channels.*, users.display_name AS owner_name
         FROM channels
         LEFT JOIN users ON users.id = channels.owner_id
        WHERE channels.slug = ?`,
      [slug]
    );

    await recordActivity(req.session.user, 'create', 'channel', created.id, {
      summary: `Created channel "${created.name}" (${created.slug})`,
      channel: {
        name: created.name,
        slug: created.slug,
        ownerId: created.owner_id,
      },
    });

    res.status(201).json(sanitizeChannel(created));
  } catch (error) {
    console.error('Failed to create channel', error);
    if (error && error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

router.put('/channels/:id', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    slug,
    description,
    heroTitle,
    heroSubtitle,
    coverImage,
    ownerId,
    badges,
    certificates,
  } = req.body;

  try {
    const existing = await loadChannelById(id);
    if (!existing) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!isSuperAdminUser(req.session.user)) {
      try {
        await ensureChannelPermission(existing.id, req.session.user);
      } catch (error) {
        if (error.code === 'FORBIDDEN_CHANNEL') {
          res.status(403).json({ error: 'لا تملك صلاحية تعديل هذه القناة.' });
          return;
        }
        throw error;
      }
    }

    const nextName = name !== undefined ? name : existing.name;
    if (!nextName) {
      res.status(400).json({ error: 'Channel name cannot be empty' });
      return;
    }

    let nextSlug = existing.slug;
    if (slug !== undefined) {
      if (!isSuperAdminUser(req.session.user) && slug !== existing.slug) {
        res.status(403).json({ error: 'لا يمكنك تغيير المعرّف.' });
        return;
      }
      nextSlug = slug;
    }

    let nextOwnerId = existing.owner_id;
    if (ownerId !== undefined) {
      if (!isSuperAdminUser(req.session.user)) {
        nextOwnerId = existing.owner_id;
      } else if (ownerId === null || ownerId === '') {
        nextOwnerId = null;
      } else {
        const owner = await get('SELECT id FROM users WHERE id = ?', [ownerId]);
        if (!owner) {
          res.status(400).json({ error: 'Owner not found' });
          return;
        }
        nextOwnerId = owner.id;
      }
    }

    const badgesValue = badges !== undefined ? serializeListField(badges) : existing.badges;
    const certificatesValue = certificates !== undefined ? serializeListField(certificates) : existing.certificates;

    await run(
      `UPDATE channels
          SET name = ?,
              slug = ?,
              description = ?,
              hero_title = ?,
              hero_subtitle = ?,
              cover_image = ?,
              owner_id = ?,
              badges = ?,
              certificates = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      [
        nextName,
        nextSlug,
        nullable(description !== undefined ? description : existing.description),
        nullable(heroTitle !== undefined ? heroTitle : existing.hero_title),
        nullable(heroSubtitle !== undefined ? heroSubtitle : existing.hero_subtitle),
        nullable(coverImage !== undefined ? coverImage : existing.cover_image),
        nextOwnerId,
        badgesValue,
        certificatesValue,
        id,
      ]
    );

    const updated = await loadChannelById(id);
    const updatedFields = Object.keys(req.body || {});
    await recordActivity(req.session.user, 'update', 'channel', id, {
      summary: `Updated channel "${updated.name}"`,
      channel: {
        name: updated.name,
        slug: updated.slug,
        ownerId: updated.owner_id,
      },
      fields: updatedFields,
    });
    res.json(sanitizeChannel(updated));
  } catch (error) {
    console.error('Failed to update channel', error);
    if (error && error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

router.delete('/channels/:id', ensureAuthenticated, requireRole('super-admin'), async (req, res) => {
  const { id } = req.params;

  try {
  const channel = await get('SELECT id, name, slug FROM channels WHERE id = ?', [id]);
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const lectureCount = await get('SELECT COUNT(*) AS total FROM lectures WHERE channel_id = ?', [id]);
    if (lectureCount && Number(lectureCount.total) > 0) {
      res.status(400).json({ error: 'Cannot delete a channel that still has lectures.' });
      return;
    }

    await run('DELETE FROM channels WHERE id = ?', [id]);

    await recordActivity(req.session.user, 'delete', 'channel', id, {
      summary: `Deleted channel "${channel.name || channel.slug || id}"`,
      channel: {
        name: channel.name,
        slug: channel.slug,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete channel', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

router.post('/articles', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), async (req, res) => {
  const {
    title,
    summary,
    content,
    slug,
    coverImage,
    detailUrl,
    videoUrl,
    galleryImages,
    isPublished,
  } = req.body;

  if (!title || !slug) {
    res.status(400).json({ error: 'Title and slug are required' });
    return;
  }

  const published = parseBoolean(isPublished);
  const timestamp = new Date().toISOString();

  try {
    const result = await run(
      `INSERT INTO articles (title, summary, content, slug, cover_image, detail_url, video_url, gallery_images, is_published, published_at, created_at, updated_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        title,
        nullable(summary),
        nullable(content),
        slug,
        nullable(coverImage),
        nullable(detailUrl),
        nullable(videoUrl),
        serializeListField(galleryImages),
        published ? 1 : 0,
        published ? timestamp : null,
        timestamp,
        timestamp,
        req.session.user.id,
      ]
    );

    const createdArticle = await get('SELECT * FROM articles WHERE id = ?', [result.lastID]);
    await recordActivity(req.session.user, 'create', 'article', createdArticle.id, {
      summary: `Created article "${createdArticle.title}"`,
      slug: createdArticle.slug,
      published: Boolean(createdArticle.is_published),
    });
    res.status(201).json(createdArticle);
  } catch (error) {
    console.error('Failed to create article', error);
    if (error && error.message && error.message.includes('UNIQUE constraint failed: articles.slug')) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create article' });
  }
});

router.put('/articles/:id', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;
  const {
    title,
    summary,
    content,
    slug,
    coverImage,
    detailUrl,
    videoUrl,
    galleryImages,
    isPublished,
  } = req.body;

  const published = parseBoolean(isPublished);
  const timestamp = new Date().toISOString();

  try {
    const existing = await get('SELECT * FROM articles WHERE id = ?', [id]);

    if (!existing) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const publishedAtValue = published
      ? existing.published_at || timestamp
      : null;

    await run(
      `UPDATE articles
          SET title = ?,
              summary = ?,
              content = ?,
              slug = ?,
              cover_image = ?,
              detail_url = ?,
              video_url = ?,
              gallery_images = ?,
              is_published = ?,
              published_at = ?,
              updated_at = ?,
              author_id = ?
        WHERE id = ?`,
      [
        title || existing.title,
        nullable(summary !== undefined ? summary : existing.summary),
        nullable(content !== undefined ? content : existing.content),
        slug || existing.slug,
        nullable(coverImage !== undefined ? coverImage : existing.cover_image),
        nullable(detailUrl !== undefined ? detailUrl : existing.detail_url),
        nullable(videoUrl !== undefined ? videoUrl : existing.video_url),
        galleryImages !== undefined ? serializeListField(galleryImages) : existing.gallery_images,
        published ? 1 : 0,
        publishedAtValue,
        timestamp,
        req.session.user.id,
        id,
      ]
    );

    const updatedArticle = await get('SELECT * FROM articles WHERE id = ?', [id]);
    const updatedFields = Object.keys(req.body || {});
    await recordActivity(req.session.user, 'update', 'article', id, {
      summary: `Updated article "${updatedArticle.title}"`,
      slug: updatedArticle.slug,
      published: Boolean(updatedArticle.is_published),
      fields: updatedFields,
    });
    res.json(updatedArticle);
  } catch (error) {
    console.error('Failed to update article', error);
    if (error && error.message && error.message.includes('UNIQUE constraint failed: articles.slug')) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update article' });
  }
});

router.delete('/articles/:id', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await get('SELECT * FROM articles WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const result = await run('DELETE FROM articles WHERE id = ?', [id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    await recordActivity(req.session.user, 'delete', 'article', id, {
      summary: `Deleted article "${existing.title}"`,
      slug: existing.slug,
      published: Boolean(existing.is_published),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete article', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

router.post('/projects', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), async (req, res) => {
  const {
    title,
    summary,
    content,
    slug,
    coverImage,
    detailUrl,
    videoUrl,
    galleryImages,
    isPublished,
  } = req.body;

  if (!title || !slug) {
    res.status(400).json({ error: 'Title and slug are required' });
    return;
  }

  const published = parseBoolean(isPublished);
  const timestamp = new Date().toISOString();

  try {
    const result = await run(
      `INSERT INTO projects (title, summary, content, slug, cover_image, detail_url, video_url, gallery_images, is_published, published_at, created_at, updated_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        title,
        nullable(summary),
        nullable(content),
        slug,
        nullable(coverImage),
        nullable(detailUrl),
        nullable(videoUrl),
        serializeListField(galleryImages),
        published ? 1 : 0,
        published ? timestamp : null,
        timestamp,
        timestamp,
        req.session.user.id,
      ]
    );

    const createdProject = await get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    await recordActivity(req.session.user, 'create', 'project', createdProject.id, {
      summary: `Created project "${createdProject.title}"`,
      slug: createdProject.slug,
      published: Boolean(createdProject.is_published),
    });
    res.status(201).json(createdProject);
  } catch (error) {
    console.error('Failed to create project', error);
    if (error && error.message && error.message.includes('UNIQUE constraint failed: projects.slug')) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/projects/:id', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;
  const {
    title,
    summary,
    content,
    slug,
    coverImage,
    detailUrl,
    videoUrl,
    galleryImages,
    isPublished,
  } = req.body;

  const published = parseBoolean(isPublished);
  const timestamp = new Date().toISOString();

  try {
    const existing = await get('SELECT * FROM projects WHERE id = ?', [id]);

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const publishedAtValue = published
      ? existing.published_at || timestamp
      : null;

    await run(
      `UPDATE projects
          SET title = ?,
              summary = ?,
              content = ?,
              slug = ?,
              cover_image = ?,
              detail_url = ?,
              video_url = ?,
              gallery_images = ?,
              is_published = ?,
              published_at = ?,
              updated_at = ?,
              author_id = ?
        WHERE id = ?`,
      [
        title || existing.title,
        nullable(summary !== undefined ? summary : existing.summary),
        nullable(content !== undefined ? content : existing.content),
        slug || existing.slug,
        nullable(coverImage !== undefined ? coverImage : existing.cover_image),
        nullable(detailUrl !== undefined ? detailUrl : existing.detail_url),
        nullable(videoUrl !== undefined ? videoUrl : existing.video_url),
        galleryImages !== undefined ? serializeListField(galleryImages) : existing.gallery_images,
        published ? 1 : 0,
        publishedAtValue,
        timestamp,
        req.session.user.id,
        id,
      ]
    );

    const updatedProject = await get('SELECT * FROM projects WHERE id = ?', [id]);
    const updatedFields = Object.keys(req.body || {});
    await recordActivity(req.session.user, 'update', 'project', id, {
      summary: `Updated project "${updatedProject.title}"`,
      slug: updatedProject.slug,
      published: Boolean(updatedProject.is_published),
      fields: updatedFields,
    });
    res.json(updatedProject);
  } catch (error) {
    console.error('Failed to update project', error);
    if (error && error.message && error.message.includes('UNIQUE constraint failed: projects.slug')) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:id', ensureAuthenticated, requireRole('editor', 'admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await run('DELETE FROM projects WHERE id = ?', [id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await recordActivity(req.session.user, 'delete', 'project', id, {
      summary: `Deleted project "${existing.title}"`,
      slug: existing.slug,
      published: Boolean(existing.is_published),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

router.get('/lectures', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  try {
    let rows;
    if (isSuperAdminUser(req.session.user)) {
      rows = await all(
        `SELECT lectures.*, channels.name AS channel_name, channels.slug AS channel_slug
           FROM lectures
           LEFT JOIN channels ON channels.id = lectures.channel_id
          ORDER BY channels.name COLLATE NOCASE, lectures.position ASC, lectures.created_at DESC`
      );
    } else {
      rows = await all(
        `SELECT lectures.*, channels.name AS channel_name, channels.slug AS channel_slug
           FROM lectures
           LEFT JOIN channels ON channels.id = lectures.channel_id
          WHERE channels.owner_id = ?
          ORDER BY lectures.position ASC, lectures.created_at DESC`,
        [req.session.user.id]
      );
    }

    res.json(rows.map(sanitizeLectureAdmin));
  } catch (error) {
    console.error('Failed to fetch lectures (admin)', error);
    res.status(500).json({ error: 'Failed to fetch lectures' });
  }
});

router.post('/lectures', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  const {
    title,
    description,
    coverImage,
    videoUrl,
    resourceUrl,
    category,
    channelId,
    position,
    isPublished,
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const channelIdentifier = channelId !== undefined ? Number(channelId) : null;
  if (!channelIdentifier) {
    res.status(400).json({ error: 'Channel is required for lectures' });
    return;
  }

  try {
    await ensureChannelPermission(channelIdentifier, req.session.user);
  } catch (error) {
    if (error.code === 'FORBIDDEN_CHANNEL') {
      res.status(403).json({ error: 'لا تملك صلاحية استخدام هذه القناة.' });
      return;
    }
    if (error.message === 'Channel not found') {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    console.error('Channel permission validation failed', error);
    res.status(500).json({ error: 'Failed to validate channel' });
    return;
  }

  const published = parseBoolean(isPublished);
  const timestamp = new Date().toISOString();

  try {
    const channel = await get('SELECT id FROM channels WHERE id = ?', [channelIdentifier]);
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    let nextPosition = null;
    if (position !== undefined && position !== null && position !== '') {
      nextPosition = Number(position);
    }

    if (!nextPosition || Number.isNaN(nextPosition)) {
      const currentMax = await get('SELECT COALESCE(MAX(position), 0) AS maxPosition FROM lectures WHERE channel_id = ?', [channelIdentifier]);
      nextPosition = (currentMax ? Number(currentMax.maxPosition) : 0) + 1;
    }

    const result = await run(
      `INSERT INTO lectures (title, description, cover_image, video_url, resource_url, category, channel_id, position, is_published, published_at, created_at, updated_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        title,
        nullable(description),
        nullable(coverImage),
        nullable(videoUrl),
        nullable(resourceUrl),
        nullable(category),
        channelIdentifier,
        nextPosition,
        published ? 1 : 0,
        published ? timestamp : null,
        timestamp,
        timestamp,
        req.session.user.id,
      ]
    );

    const createdLecture = await get(
      `SELECT lectures.*, channels.name AS channel_name, channels.slug AS channel_slug
         FROM lectures
         LEFT JOIN channels ON channels.id = lectures.channel_id
        WHERE lectures.id = ?`,
      [result.lastID]
    );
    await recordActivity(req.session.user, 'create', 'lecture', createdLecture.id, {
      summary: `Created lecture "${createdLecture.title}"`,
      channelId: createdLecture.channel_id,
      channelName: createdLecture.channel_name,
      channelSlug: createdLecture.channel_slug,
      published: Boolean(createdLecture.is_published),
    });
    res.status(201).json(createdLecture);
  } catch (error) {
    console.error('Failed to create lecture', error);
    res.status(500).json({ error: 'Failed to create lecture' });
  }
});

router.put('/lectures/:id', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    coverImage,
    videoUrl,
    resourceUrl,
    category,
    channelId,
    position,
    isPublished,
  } = req.body;

  const published = parseBoolean(isPublished);
  const timestamp = new Date().toISOString();

  try {
    const existing = await loadLectureById(id);

    if (!existing) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const targetChannelId = channelId !== undefined && channelId !== null && channelId !== ''
      ? Number(channelId)
      : existing.channel_id;

    try {
      await ensureChannelPermission(targetChannelId, req.session.user);
    } catch (error) {
      if (error.code === 'FORBIDDEN_CHANNEL') {
        res.status(403).json({ error: 'لا تملك صلاحية تعديل محاضرات هذه القناة.' });
        return;
      }
      if (error.message === 'Channel not found') {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }
      throw error;
    }

    const publishedAtValue = published
      ? existing.published_at || timestamp
      : null;

    let nextPosition = existing.position;
    if (position !== undefined && position !== null && position !== '') {
      const parsedPosition = Number(position);
      if (!Number.isNaN(parsedPosition) && parsedPosition > 0) {
        nextPosition = parsedPosition;
      }
    } else if (existing.channel_id !== targetChannelId) {
      const currentMax = await get('SELECT COALESCE(MAX(position), 0) AS maxPosition FROM lectures WHERE channel_id = ?', [targetChannelId]);
      nextPosition = (currentMax ? Number(currentMax.maxPosition) : 0) + 1;
    }

    await run(
      `UPDATE lectures
          SET title = ?,
              description = ?,
              cover_image = ?,
              video_url = ?,
              resource_url = ?,
              category = ?,
              channel_id = ?,
              position = ?,
              is_published = ?,
              published_at = ?,
              updated_at = ?,
              author_id = ?
        WHERE id = ?`,
      [
        title || existing.title,
        nullable(description !== undefined ? description : existing.description),
        nullable(coverImage !== undefined ? coverImage : existing.cover_image),
        nullable(videoUrl !== undefined ? videoUrl : existing.video_url),
        nullable(resourceUrl !== undefined ? resourceUrl : existing.resource_url),
        nullable(category !== undefined ? category : existing.category),
        targetChannelId,
        nextPosition,
        published ? 1 : 0,
        publishedAtValue,
        timestamp,
        req.session.user.id,
        id,
      ]
    );

    const updatedLecture = await get(
      `SELECT lectures.*, channels.name AS channel_name, channels.slug AS channel_slug
         FROM lectures
         LEFT JOIN channels ON channels.id = lectures.channel_id
        WHERE lectures.id = ?`,
      [id]
    );
    const updatedFields = Object.keys(req.body || {});
    await recordActivity(req.session.user, 'update', 'lecture', id, {
      summary: `Updated lecture "${updatedLecture.title}"`,
      channelId: updatedLecture.channel_id,
      channelName: updatedLecture.channel_name,
      channelSlug: updatedLecture.channel_slug,
      published: Boolean(updatedLecture.is_published),
      fields: updatedFields,
    });
    res.json(updatedLecture);
  } catch (error) {
    console.error('Failed to update lecture', error);
    res.status(500).json({ error: 'Failed to update lecture' });
  }
});

router.delete('/lectures/:id', ensureAuthenticated, requireRole('admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await loadLectureById(id);
    if (!existing) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    try {
      await ensureChannelPermission(existing.channel_id, req.session.user);
    } catch (error) {
      if (error.code === 'FORBIDDEN_CHANNEL') {
        res.status(403).json({ error: 'لا تملك صلاحية حذف هذه المحاضرة.' });
        return;
      }
      if (error.message === 'Channel not found') {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }
      throw error;
    }

    const result = await run('DELETE FROM lectures WHERE id = ?', [id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    await recordActivity(req.session.user, 'delete', 'lecture', id, {
      summary: `Deleted lecture "${existing.title}"`,
      channelId: existing.channel_id,
      channelName: existing.channel_name || null,
      channelSlug: existing.channel_slug || null,
      published: Boolean(existing.is_published),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lecture', error);
    res.status(500).json({ error: 'Failed to delete lecture' });
  }
});

module.exports = router;
