const bcrypt = require('bcrypt');
const { run, get, all } = require('./index');

async function ensureColumn(tableName, columnName, alterStatement) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await run(alterStatement);
  }
}

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    avatar_url TEXT,
    bio TEXT,
    badges TEXT,
    certificates TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

const createArticlesTable = `
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image TEXT,
    detail_url TEXT,
    video_url TEXT,
    gallery_images TEXT,
    is_published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    author_id INTEGER,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createProjectsTable = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image TEXT,
    detail_url TEXT,
    video_url TEXT,
    gallery_images TEXT,
    is_published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    author_id INTEGER,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createChannelsTable = `
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    hero_title TEXT,
    hero_subtitle TEXT,
    cover_image TEXT,
    badges TEXT,
    certificates TEXT,
    owner_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createLecturesTable = `
  CREATE TABLE IF NOT EXISTS lectures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    video_url TEXT,
    resource_url TEXT,
    category TEXT,
    channel_id INTEGER,
    position INTEGER,
    is_published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    author_id INTEGER,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
  )
`;

const createSiteSettingsTable = `
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

const createActivityLogsTable = `
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

async function ensureSiteSetting(key, value) {
  const existing = await get('SELECT key FROM site_settings WHERE key = ?', [key]);
  if (existing) {
    return;
  }
  await run(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [key, value === undefined ? null : value]
  );
}

async function ensureDefaultAdmin({ email, password, displayName }) {
  const existingUser = await get('SELECT id, role FROM users WHERE email = ?', [email]);

  if (existingUser) {
    if (existingUser.role !== 'super-admin') {
      await run('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?', [
        'super-admin',
        existingUser.id,
      ]);
      console.log(`Ensured ${email} has super-admin role`);
    }
    return existingUser.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await run(
    `INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, 'super-admin')`,
    [email, passwordHash, displayName]
  );
  console.log(`Default admin user created for ${email}. Please change the password after first login.`);
  return result.lastID;
}

async function ensureChannel({
  slug,
  name,
  ownerEmail,
  heroTitle,
  heroSubtitle,
  description,
  coverImage,
}) {
  const existingChannel = await get('SELECT id FROM channels WHERE slug = ?', [slug]);
  if (existingChannel) {
    return;
  }

  let ownerId = null;
  if (ownerEmail) {
    const owner = await get('SELECT id FROM users WHERE email = ?', [ownerEmail]);
    if (owner) {
      ownerId = owner.id;
    }
  }

  await run(
    `INSERT INTO channels (name, slug, description, hero_title, hero_subtitle, cover_image, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [name, slug, description || null, heroTitle || null, heroSubtitle || null, coverImage || null, ownerId]
  );
}

async function initializeDatabase(config) {
  await run('PRAGMA foreign_keys = ON');
  await run(createUsersTable);
  await run(createArticlesTable);
  await run(createProjectsTable);
  await run(createChannelsTable);
  await run(createLecturesTable);
  await run(createSiteSettingsTable);
  await run(createActivityLogsTable);

  await ensureColumn('users', 'avatar_url', 'ALTER TABLE users ADD COLUMN avatar_url TEXT');
  await ensureColumn('users', 'bio', 'ALTER TABLE users ADD COLUMN bio TEXT');
  await ensureColumn('users', 'badges', 'ALTER TABLE users ADD COLUMN badges TEXT');
  await ensureColumn('users', 'certificates', 'ALTER TABLE users ADD COLUMN certificates TEXT');
  await ensureColumn('users', 'profile_slug', 'ALTER TABLE users ADD COLUMN profile_slug TEXT');
  await ensureColumn('users', 'profile_headline', 'ALTER TABLE users ADD COLUMN profile_headline TEXT');
  await ensureColumn(
    'users',
    'profile_visible',
    'ALTER TABLE users ADD COLUMN profile_visible INTEGER NOT NULL DEFAULT 0'
  );
  await ensureColumn('users', 'profile_hero_image', 'ALTER TABLE users ADD COLUMN profile_hero_image TEXT');
  await ensureColumn('users', 'profile_contact_links', 'ALTER TABLE users ADD COLUMN profile_contact_links TEXT');
  await ensureColumn('users', 'profile_position', 'ALTER TABLE users ADD COLUMN profile_position INTEGER');
  await ensureColumn('articles', 'video_url', 'ALTER TABLE articles ADD COLUMN video_url TEXT');
  await ensureColumn('articles', 'gallery_images', 'ALTER TABLE articles ADD COLUMN gallery_images TEXT');
  await ensureColumn('projects', 'video_url', 'ALTER TABLE projects ADD COLUMN video_url TEXT');
  await ensureColumn('projects', 'gallery_images', 'ALTER TABLE projects ADD COLUMN gallery_images TEXT');
  await ensureColumn('lectures', 'cover_image', 'ALTER TABLE lectures ADD COLUMN cover_image TEXT');
  await ensureColumn('lectures', 'video_url', 'ALTER TABLE lectures ADD COLUMN video_url TEXT');
  await ensureColumn('lectures', 'resource_url', 'ALTER TABLE lectures ADD COLUMN resource_url TEXT');
  await ensureColumn('lectures', 'category', 'ALTER TABLE lectures ADD COLUMN category TEXT');
  await ensureColumn('lectures', 'channel_id', 'ALTER TABLE lectures ADD COLUMN channel_id INTEGER');
  await ensureColumn('lectures', 'position', 'ALTER TABLE lectures ADD COLUMN position INTEGER');

  await run(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug) WHERE profile_slug IS NOT NULL'
  );

  const adminEmail = config.defaultAdminEmail || 'admin@cyberx.local';
  const adminPassword = config.defaultAdminPassword || 'ChangeMe!';
  const adminDisplayName = config.defaultAdminDisplayName || 'CyberX Admin';

  await ensureDefaultAdmin({
    email: adminEmail,
    password: adminPassword,
    displayName: adminDisplayName,
  });

  try {
    await ensureChannel({
      slug: 'abdallah-channel',
      name: 'قناة عبدالله',
      ownerEmail: adminEmail,
      heroTitle: 'أنظمة التشغيل',
      heroSubtitle: 'بواسطة عبدالله ياسر',
      description: 'قناة محاضرات أنظمة التشغيل الخاصة بفريق Cyber X.',
      coverImage: null,
    });

    await ensureChannel({
      slug: 'ehab-channel',
      name: 'قناة إيهاب',
      ownerEmail: adminEmail,
      heroTitle: 'شبكات الحاسوب',
      heroSubtitle: 'بواسطة إيهاب ثائر',
      description: 'قناة محاضرات شبكات الحاسوب ضمن Cyber X.',
      coverImage: null,
    });
  } catch (error) {
    console.warn('Failed to ensure default channels', error);
  }

  try {
    await ensureSiteSetting('home.heroImage', null);
    await ensureSiteSetting('home.sections.order', JSON.stringify(['projects', 'lectures', 'articles']));
    await ensureSiteSetting('home.about.heading', 'من نحن');
    await ensureSiteSetting(
      'home.about.textAr',
      'سبعة من طلاب هندسة تقنيات الأمن السيبراني / الجامعة التقنية الشمالية'
    );
    await ensureSiteSetting(
      'home.about.textEn',
      'Seven students of Cybersecurity Engineering / Northern Technical University'
    );
    await ensureSiteSetting('home.vision.heading', 'رؤيتنا');
    await ensureSiteSetting('home.vision.textAr', 'أن نكون قوة معرفية');
    await ensureSiteSetting('home.vision.textEn', 'To be a force of knowledge');
  } catch (error) {
    console.warn('Failed to ensure default site settings', error);
  }
}

module.exports = {
  initializeDatabase,
};
