const express = require('express');
const { all, get } = require('../db');

const router = express.Router();

const HOME_SECTION_KEYS = ['projects', 'lectures', 'articles'];

function parseHomeSectionOrder(value) {
  if (!value) {
    return [...HOME_SECTION_KEYS];
  }

  let order = [];
  if (Array.isArray(value)) {
    order = value.map((item) => String(item || '').trim());
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      order = [];
    } else if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          order = parsed.map((item) => String(item || '').trim());
        }
      } catch (error) {
        order = [];
      }
    }

    if (!order.length) {
      order = trimmed.split(',').map((item) => item.trim());
    }
  }

  const filtered = order.filter((key) => HOME_SECTION_KEYS.includes(key));
  HOME_SECTION_KEYS.forEach((key) => {
    if (!filtered.includes(key)) {
      filtered.push(key);
    }
  });

  return filtered;
}

const parseListField = (value) => {
  if (!value) {
    return [];
  }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry)).filter(Boolean);
    }
  } catch (error) {
    // ignore parse errors
  }
  if (typeof value === 'string') {
    return String(value)
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeMediaFields = (row) => {
  if (!row || typeof row !== 'object') {
    return row;
  }
  const normalized = { ...row };
  normalized.videoUrl = row.videoUrl ? String(row.videoUrl).trim() : '';
  normalized.galleryImages = parseListField(row.galleryImages);
  return normalized;
};

const sanitizeTeamProfile = (row) => ({
  id: row.id,
  displayName: row.display_name,
  profileSlug: row.profile_slug,
  profileHeadline: row.profile_headline ? String(row.profile_headline).trim() : '',
  avatarUrl: row.avatar_url ? String(row.avatar_url).trim() : '',
  bio: row.bio ? String(row.bio).trim() : '',
  badges: parseListField(row.badges),
  certificates: parseListField(row.certificates),
  profileHeroImage: row.profile_hero_image ? String(row.profile_hero_image).trim() : '',
  profileContactLinks: parseListField(row.profile_contact_links),
  profilePosition: typeof row.profile_position === 'number' ? row.profile_position : null,
  updatedAt: row.updated_at,
});

router.get('/projects', async (req, res) => {
  const { includeDrafts, authorId, authorSlug } = req.query;
  const clauses = [];
  const params = [];

  if (includeDrafts !== 'true') {
    clauses.push('projects.is_published = 1');
  }

  if (authorId) {
    clauses.push('projects.author_id = ?');
    params.push(authorId);
  }

  if (authorSlug) {
    clauses.push(
      `projects.author_id IN (
        SELECT id FROM users
         WHERE (profile_slug IS NOT NULL AND LOWER(profile_slug) = LOWER(?))
            OR LOWER(email) = LOWER(?)
      )`
    );
    params.push(authorSlug, authorSlug);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    const projects = await all(
      `SELECT id, title, summary, content, slug, cover_image AS coverImage, detail_url AS detailUrl,
        video_url AS videoUrl, gallery_images AS galleryImages,
        is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt,
        updated_at AS updatedAt, author_id AS authorId,
        (SELECT display_name FROM users WHERE users.id = projects.author_id) AS authorName
         FROM projects
         ${whereClause}
         ORDER BY COALESCE(published_at, created_at) DESC`,
      params
    );
    const normalized = projects.map((project) => normalizeMediaFields(project));

    res.json(normalized);
  } catch (error) {
    console.error('Failed to fetch projects', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/projects/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const project = await get(
      `SELECT id, title, summary, content, slug, cover_image AS coverImage, detail_url AS detailUrl,
        video_url AS videoUrl, gallery_images AS galleryImages,
        is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt,
        updated_at AS updatedAt, author_id AS authorId,
        (SELECT display_name FROM users WHERE users.id = projects.author_id) AS authorName
         FROM projects
        WHERE slug = ?`,
      [slug]
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(normalizeMediaFields(project));
  } catch (error) {
    console.error('Failed to fetch project', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.get('/articles', async (req, res) => {
  const { includeDrafts } = req.query;
  const isPublishedClause = includeDrafts === 'true' ? '' : 'WHERE is_published = 1';

  try {
    const articles = await all(
      `SELECT id, title, summary, content, slug, cover_image AS coverImage, detail_url AS detailUrl,
        video_url AS videoUrl, gallery_images AS galleryImages,
        is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt,
        updated_at AS updatedAt, author_id AS authorId,
        (SELECT display_name FROM users WHERE users.id = articles.author_id) AS authorName
         FROM articles ${isPublishedClause}
         ORDER BY COALESCE(published_at, created_at) DESC`
    );

    const normalized = articles.map((article) => normalizeMediaFields(article));

    res.json(normalized);
  } catch (error) {
    console.error('Failed to fetch articles', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

router.get('/articles/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const article = await get(
      `SELECT id, title, summary, content, slug, cover_image AS coverImage, detail_url AS detailUrl,
        video_url AS videoUrl, gallery_images AS galleryImages,
        is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt,
        updated_at AS updatedAt, author_id AS authorId,
        (SELECT display_name FROM users WHERE users.id = articles.author_id) AS authorName
         FROM articles
        WHERE slug = ?`,
      [slug]
    );

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json(normalizeMediaFields(article));
  } catch (error) {
    console.error('Failed to fetch article', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

router.get('/lectures', async (req, res) => {
  const { includeDrafts, category, channelSlug, channelId } = req.query;
  const clauses = [];
  const params = [];

  if (includeDrafts !== 'true') {
    clauses.push('lectures.is_published = 1');
  }

  if (category) {
    clauses.push('lectures.category = ?');
    params.push(category);
  }

  if (channelSlug) {
    clauses.push('channels.slug = ?');
    params.push(channelSlug);
  }

  if (channelId) {
    clauses.push('lectures.channel_id = ?');
    params.push(channelId);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    const lectures = await all(
      `SELECT lectures.id,
              lectures.title,
              lectures.description,
              lectures.cover_image AS coverImage,
              lectures.video_url AS videoUrl,
              lectures.resource_url AS resourceUrl,
              lectures.category,
              lectures.channel_id AS channelId,
              lectures.position,
              lectures.is_published AS isPublished,
              lectures.published_at AS publishedAt,
              lectures.created_at AS createdAt,
              lectures.updated_at AS updatedAt,
              lectures.author_id AS authorId,
              channels.name AS channelName,
              channels.slug AS channelSlug,
              channels.hero_title AS channelHeroTitle,
              channels.hero_subtitle AS channelHeroSubtitle,
              channels.cover_image AS channelCoverImage,
              (SELECT display_name FROM users WHERE users.id = lectures.author_id) AS authorName
         FROM lectures
         LEFT JOIN channels ON channels.id = lectures.channel_id
         ${whereClause}
         ORDER BY channels.name COLLATE NOCASE, lectures.position ASC, COALESCE(lectures.published_at, lectures.created_at) DESC`,
      params
    );

    res.json(lectures);
  } catch (error) {
    console.error('Failed to fetch lectures', error);
    res.status(500).json({ error: 'Failed to fetch lectures' });
  }
});

router.get('/lectures/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const lecture = await get(
      `SELECT lectures.id,
              lectures.title,
              lectures.description,
              lectures.cover_image AS coverImage,
              lectures.video_url AS videoUrl,
              lectures.resource_url AS resourceUrl,
              lectures.category,
              lectures.channel_id AS channelId,
              lectures.position,
              lectures.is_published AS isPublished,
              lectures.published_at AS publishedAt,
              lectures.created_at AS createdAt,
              lectures.updated_at AS updatedAt,
              lectures.author_id AS authorId,
              channels.name AS channelName,
              channels.slug AS channelSlug,
              channels.description AS channelDescription,
              channels.hero_title AS channelHeroTitle,
              channels.hero_subtitle AS channelHeroSubtitle,
              channels.cover_image AS channelCoverImage,
              (SELECT display_name FROM users WHERE users.id = lectures.author_id) AS authorName
         FROM lectures
         LEFT JOIN channels ON channels.id = lectures.channel_id
        WHERE lectures.id = ?`,
      [id]
    );

    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    res.json(lecture);
  } catch (error) {
    console.error('Failed to fetch lecture', error);
    res.status(500).json({ error: 'Failed to fetch lecture' });
  }
});

router.get('/channels', async (req, res) => {
  try {
    const rows = await all(
      `SELECT channels.*, users.display_name AS ownerName
         FROM channels
         LEFT JOIN users ON users.id = channels.owner_id
        ORDER BY channels.created_at DESC`
    );

    const payload = rows.map((row) => ({
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
      ownerName: row.ownerName || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(payload);
  } catch (error) {
    console.error('Failed to fetch channels', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.get('/channels/:slug', async (req, res) => {
  const { slug } = req.params;
  const includeLectures = req.query.includeLectures === 'true';

  try {
    const channel = await get(
      `SELECT channels.*, users.display_name AS ownerName
         FROM channels
         LEFT JOIN users ON users.id = channels.owner_id
        WHERE channels.slug = ?`,
      [slug]
    );

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const payload = {
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      description: channel.description || '',
      heroTitle: channel.hero_title || '',
      heroSubtitle: channel.hero_subtitle || '',
      coverImage: channel.cover_image || '',
      badges: parseListField(channel.badges),
      certificates: parseListField(channel.certificates),
      ownerId: channel.owner_id,
      ownerName: channel.ownerName || null,
      createdAt: channel.created_at,
      updatedAt: channel.updated_at,
    };

    if (includeLectures) {
      const lectures = await all(
        `SELECT lectures.id,
                lectures.title,
                lectures.description,
                lectures.cover_image AS coverImage,
                lectures.video_url AS videoUrl,
                lectures.resource_url AS resourceUrl,
                lectures.category,
                lectures.position,
                lectures.is_published AS isPublished,
                lectures.published_at AS publishedAt,
                lectures.created_at AS createdAt,
                lectures.updated_at AS updatedAt
           FROM lectures
          WHERE lectures.channel_id = ? AND lectures.is_published = 1
          ORDER BY lectures.position ASC, COALESCE(lectures.published_at, lectures.created_at) DESC`,
        [channel.id]
      );
      payload.lectures = lectures;
    }

    res.json(payload);
  } catch (error) {
    console.error('Failed to fetch channel', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

router.get('/site-settings', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM site_settings');
    const settings = {};
    const homeSections = {};

    rows.forEach((row) => {
      if (!row || !row.key) {
        return;
      }

      const { key, value } = row;
      if (value === null || value === undefined || value === '') {
        return;
      }

      settings[key] = value;

      if (key === 'home.heroImage') {
        settings.homeHeroImage = value;
      }

      if (key === 'home.about.heading') {
        settings.homeAboutHeading = value;
      }

      if (key === 'home.about.textAr') {
        settings.homeAboutTextAr = value;
      }

      if (key === 'home.about.textEn') {
        settings.homeAboutTextEn = value;
      }

      if (key === 'home.vision.heading') {
        settings.homeVisionHeading = value;
      }

      if (key === 'home.vision.textAr') {
        settings.homeVisionTextAr = value;
      }

      if (key === 'home.vision.textEn') {
        settings.homeVisionTextEn = value;
      }

      if (key === 'home.sections.order') {
        settings.homeSectionsOrder = parseHomeSectionOrder(value);
      }

      if (key.startsWith('home.sections.')) {
        const [, , sectionKey, field] = key.split('.');
        if (sectionKey && field) {
          if (!homeSections[sectionKey]) {
            homeSections[sectionKey] = {};
          }
          homeSections[sectionKey][field] = value;
        }
      }

    });

    if (!settings.homeSectionsOrder) {
      settings.homeSectionsOrder = [...HOME_SECTION_KEYS];
    }

    if (Object.keys(homeSections).length) {
      settings.homeSections = homeSections;
    }

    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch site settings', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

router.get('/team', async (req, res) => {
  try {
    const rows = await all(
      `SELECT id,
              display_name,
              profile_slug,
              profile_headline,
              avatar_url,
              bio,
              badges,
              certificates,
              profile_hero_image,
              profile_contact_links,
              profile_position,
              updated_at
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

    res.json(rows.map(sanitizeTeamProfile));
  } catch (error) {
    console.error('Failed to fetch team profiles', error);
    res.status(500).json({ error: 'Failed to fetch team profiles' });
  }
});

router.get('/team/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const row = await get(
      `SELECT id,
              display_name,
              profile_slug,
              profile_headline,
              avatar_url,
              bio,
              badges,
              certificates,
              profile_hero_image,
              profile_contact_links,
              profile_position,
              updated_at
         FROM users
        WHERE profile_visible = 1
          AND profile_slug = ?
        LIMIT 1`,
      [slug]
    );

    if (!row) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(sanitizeTeamProfile(row));
  } catch (error) {
    console.error('Failed to fetch team profile', error);
    res.status(500).json({ error: 'Failed to fetch team profile' });
  }
});

module.exports = router;
