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

const parseJsonArrayField = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value) || [];
  } catch (error) {
    return [];
  }
};

const normalizeCollaborators = (value) => {
  const entries = parseJsonArrayField(value);
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const id = Number(entry.id);
      if (!Number.isFinite(id)) {
        return null;
      }
      return {
        id,
        displayName: entry.displayName || entry.display_name || entry.email || `User #${id}`,
        displayNameAr: entry.displayNameAr || entry.display_name_ar || null,
        email: entry.email || null,
        role: entry.role || null,
        profileSlug: entry.profileSlug || entry.profile_slug || null,
      };
    })
    .filter(Boolean);
};

const ABSOLUTE_HREF_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

const isAbsoluteHref = (value) => ABSOLUTE_HREF_PATTERN.test(value);

const normalizeInternalHref = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  if (isAbsoluteHref(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('../') || trimmed.startsWith('./')) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\/+/u, '')}`;
};

const resolveDetailUrl = (type, row) => {
  const raw = row.detailUrl || row.detail_url || null;
  const normalized = normalizeInternalHref(raw);
  if (normalized) {
    return normalized;
  }

  if (!row.slug) {
    return null;
  }

  if (type === 'project') {
    return `/Projects/detail.html?slug=${encodeURIComponent(row.slug)}`;
  }
  if (type === 'article') {
    return `/Articles/detail.html?slug=${encodeURIComponent(row.slug)}`;
  }

  return null;
};

const normalizeMediaFields = (row, { type } = {}) => {
  if (!row || typeof row !== 'object') {
    return row;
  }
  const normalized = { ...row };
  normalized.detailUrl = resolveDetailUrl(type, row);
  normalized.videoUrl = row.videoUrl ? String(row.videoUrl).trim() : '';
  normalized.galleryImages = parseListField(row.galleryImages);
  normalized.collaborators = normalizeCollaborators(row.collaborators);
  normalized.authorName = row.authorName || row.author_name || null;
  normalized.authorNameAr = row.authorNameAr || row.author_name_ar || null;
  return normalized;
};

const sanitizeTeamProfile = (row) => ({
  id: row.id,
  displayName: row.display_name,
  displayNameAr: row.display_name_ar,
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

const sanitizeArticleSummary = (row) => {
  if (!row) {
    return null;
  }

  const fallbackDetail = row.detail_url
    ? String(row.detail_url).trim()
    : row.slug
    ? `../Articles/detail.html?slug=${encodeURIComponent(row.slug)}`
    : null;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ? String(row.summary).trim() : '',
    detailUrl: fallbackDetail,
    coverImage: row.cover_image ? String(row.cover_image).trim() : '',
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
};

const parseActivityDetails = (value) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const describeActivity = (row) => {
  const details = parseActivityDetails(row.details);
  if (details && typeof details.summary === 'string' && details.summary.trim()) {
    return details.summary.trim();
  }
  if (details && typeof details.message === 'string' && details.message.trim()) {
    return details.message.trim();
  }
  const resourceLabel = row.resource ? row.resource.replace(/_/g, ' ') : 'resource';
  return `Performed ${row.action} on ${resourceLabel}`;
};

const sanitizeActivityEntry = (row) => ({
  id: row.id,
  action: row.action,
  resource: row.resource,
  resourceId: row.resource_id,
  summary: describeActivity(row),
  createdAt: row.created_at,
});

router.get('/projects', async (req, res) => {
  const { includeDrafts, authorId, authorSlug } = req.query;
  const clauses = [];
  const params = [];

  if (includeDrafts !== 'true') {
    clauses.push('projects.is_published = 1');
  }

  if (authorId) {
    clauses.push(`(
      projects.author_id = ?
      OR EXISTS (
        SELECT 1
          FROM project_collaborators AS pc
         WHERE pc.project_id = projects.id
           AND pc.user_id = ?
      )
    )`);
    params.push(authorId, authorId);
  }

  if (authorSlug) {
    clauses.push(`(
      projects.author_id IN (
        SELECT id FROM users
         WHERE (profile_slug IS NOT NULL AND LOWER(profile_slug) = LOWER(?))
            OR LOWER(email) = LOWER(?)
      )
      OR EXISTS (
        SELECT 1
          FROM project_collaborators AS pc
          JOIN users AS collaborator ON collaborator.id = pc.user_id
         WHERE pc.project_id = projects.id
           AND (
                 (collaborator.profile_slug IS NOT NULL AND LOWER(collaborator.profile_slug) = LOWER(?))
              OR LOWER(collaborator.email) = LOWER(?)
           )
      )
    )`);
    params.push(authorSlug, authorSlug, authorSlug, authorSlug);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    const projects = await all(
      `SELECT projects.id,
              projects.title,
              projects.summary,
              projects.content,
              projects.slug,
              projects.cover_image AS coverImage,
              projects.detail_url AS detailUrl,
              projects.video_url AS videoUrl,
              projects.gallery_images AS galleryImages,
              projects.is_published AS isPublished,
              projects.published_at AS publishedAt,
              projects.created_at AS createdAt,
              projects.updated_at AS updatedAt,
              projects.author_id AS authorId,
              (SELECT display_name FROM users WHERE users.id = projects.author_id) AS authorName,
              (SELECT display_name_ar FROM users WHERE users.id = projects.author_id) AS authorNameAr,
              (
                SELECT json_group_array(
                         json_object(
                           'id', collaborator.id,
                           'displayName', collaborator.display_name,
                           'displayNameAr', collaborator.display_name_ar,
                           'email', collaborator.email,
                           'role', collaborator.role,
                           'profileSlug', collaborator.profile_slug
                         )
                       )
                  FROM (
                         SELECT users.id,
                                users.display_name,
                                users.display_name_ar,
                                users.email,
                                users.role,
                                users.profile_slug,
                                COALESCE(pc.sort_order, 999) AS sort_order
                           FROM project_collaborators AS pc
                           JOIN users ON users.id = pc.user_id
                          WHERE pc.project_id = projects.id
                          ORDER BY sort_order, users.display_name COLLATE NOCASE
                       ) AS collaborator
              ) AS collaborators
         FROM projects
         ${whereClause}
         ORDER BY COALESCE(projects.published_at, projects.created_at) DESC`,
      params
    );
  const normalized = projects.map((project) => normalizeMediaFields(project, { type: 'project' }));

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
      `SELECT projects.id,
              projects.title,
              projects.summary,
              projects.content,
              projects.slug,
              projects.cover_image AS coverImage,
              projects.detail_url AS detailUrl,
              projects.video_url AS videoUrl,
              projects.gallery_images AS galleryImages,
              projects.is_published AS isPublished,
              projects.published_at AS publishedAt,
              projects.created_at AS createdAt,
              projects.updated_at AS updatedAt,
              projects.author_id AS authorId,
              (SELECT display_name FROM users WHERE users.id = projects.author_id) AS authorName,
              (SELECT display_name_ar FROM users WHERE users.id = projects.author_id) AS authorNameAr,
              (
                SELECT json_group_array(
                         json_object(
                           'id', collaborator.id,
                           'displayName', collaborator.display_name,
                           'displayNameAr', collaborator.display_name_ar,
                           'email', collaborator.email,
                           'role', collaborator.role,
                           'profileSlug', collaborator.profile_slug
                         )
                       )
                  FROM (
                         SELECT users.id,
                                users.display_name,
                                users.display_name_ar,
                                users.email,
                                users.role,
                                users.profile_slug,
                                COALESCE(pc.sort_order, 999) AS sort_order
                           FROM project_collaborators AS pc
                           JOIN users ON users.id = pc.user_id
                          WHERE pc.project_id = projects.id
                          ORDER BY sort_order, users.display_name COLLATE NOCASE
                       ) AS collaborator
              ) AS collaborators
         FROM projects
        WHERE projects.slug = ?`,
      [slug]
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

  res.json(normalizeMediaFields(project, { type: 'project' }));
  } catch (error) {
    console.error('Failed to fetch project', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.get('/articles', async (req, res) => {
  const { includeDrafts, authorId, authorSlug } = req.query;
  const clauses = [];
  const params = [];

  if (includeDrafts !== 'true') {
    clauses.push('articles.is_published = 1');
  }

  if (authorId) {
    clauses.push('articles.author_id = ?');
    params.push(authorId);
  }

  if (authorSlug) {
    clauses.push(`articles.author_id IN (
      SELECT id FROM users
       WHERE (profile_slug IS NOT NULL AND LOWER(profile_slug) = LOWER(?))
          OR LOWER(email) = LOWER(?)
    )`);
    params.push(authorSlug, authorSlug);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    const articles = await all(
      `SELECT id, title, summary, content, slug, cover_image AS coverImage, detail_url AS detailUrl,
        video_url AS videoUrl, gallery_images AS galleryImages,
        is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt,
        updated_at AS updatedAt, author_id AS authorId,
        (SELECT display_name FROM users WHERE users.id = articles.author_id) AS authorName,
        (SELECT display_name_ar FROM users WHERE users.id = articles.author_id) AS authorNameAr
         FROM articles
         ${whereClause}
         ORDER BY COALESCE(published_at, created_at) DESC`,
      params
    );

  const normalized = articles.map((article) => normalizeMediaFields(article, { type: 'article' }));

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
        (SELECT display_name FROM users WHERE users.id = articles.author_id) AS authorName,
        (SELECT display_name_ar FROM users WHERE users.id = articles.author_id) AS authorNameAr
         FROM articles
        WHERE slug = ?`,
      [slug]
    );

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

  res.json(normalizeMediaFields(article, { type: 'article' }));
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
        display_name_ar,
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
              display_name_ar,
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

    const [articles, activities] = await Promise.all([
      all(
        `SELECT id,
                title,
                summary,
                slug,
                cover_image,
                detail_url,
                published_at,
                created_at
           FROM articles
          WHERE author_id = ?
            AND is_published = 1
          ORDER BY COALESCE(published_at, created_at) DESC
          LIMIT 20`,
        [row.id]
      ),
      all(
        `SELECT id,
                action,
                resource,
                resource_id,
                details,
                created_at
           FROM activity_logs
          WHERE user_id = ?
          ORDER BY datetime(created_at) DESC
          LIMIT 20`,
        [row.id]
      ),
    ]);

    const profile = sanitizeTeamProfile(row);
    profile.articles = articles.map(sanitizeArticleSummary).filter(Boolean);
    profile.activities = activities.map(sanitizeActivityEntry).filter(Boolean);

    res.json(profile);
  } catch (error) {
    console.error('Failed to fetch team profile', error);
    res.status(500).json({ error: 'Failed to fetch team profile' });
  }
});

module.exports = router;
