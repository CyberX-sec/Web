/* global CyberXApi */
(function initDetailPage() {
  if (typeof window === 'undefined') {
    return;
  }

  const selectors = {
    hero: '.hero',
    heroTitle: '[data-detail-hero-title]',
    heroSubtitle: '[data-detail-hero-subtitle]',
    kicker: '[data-detail-kicker]',
    meta: '[data-detail-meta]',
    body: '[data-detail-body]',
    video: '[data-detail-video]',
    gallery: '[data-detail-gallery]',
    collaborators: '[data-detail-collaborators]',
    collaboratorsList: '[data-detail-collaborators-list]',
    error: '#detail-error',
    loader: '#loader',
    loaderText: '#loader-text',
    pageContent: '#page-content',
  };

  let defaultHeroImage = null;

  const kickerCopy = {
    project: {
      en: 'CYBER X PROJECT',
      ar: 'مشروع Cyber X',
    },
    article: {
      en: 'CYBER X ARTICLE',
      ar: 'مقال Cyber X',
    },
    lecture: {
      en: 'CYBER X LECTURE',
      ar: 'محاضرة Cyber X',
    },
  };

  const formatDate = (value) => {
    if (!value) {
      return null;
    }
    try {
      const date = new Date(value);
      return {
        en: date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        ar: date.toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };
    } catch (error) {
      return {
        en: value,
        ar: value,
      };
    }
  };

  const renderMeta = (metaNode, segments) => {
    if (!metaNode) {
      return;
    }
    metaNode.innerHTML = '';
    if (!segments.length) {
      metaNode.hidden = true;
      return;
    }

    metaNode.hidden = false;

    segments.forEach((segment, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.className = 'meta-separator';
        separator.textContent = '•';
        metaNode.appendChild(separator);
      }

      const wrapper = document.createElement('span');
      wrapper.className = 'meta-item';

      const primary = document.createElement('span');
      primary.textContent = segment.en;
      wrapper.appendChild(primary);

      if (segment.ar) {
        const translation = document.createElement('span');
        translation.className = 'translation';
        translation.dir = 'rtl';
        translation.lang = 'ar';
        translation.textContent = segment.ar;
        wrapper.appendChild(translation);
      }

      metaNode.appendChild(wrapper);
    });
  };

  const containsHtml = (value) => /<[a-z][\s\S]*>/i.test(String(value || ''));

  function resolveAssetUrl(url) {
    if (!url) {
      return '';
    }
    const trimmed = String(url).trim();
    if (!trimmed) {
      return '';
    }
    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    if (trimmed.startsWith('../')) {
      return trimmed;
    }
    return `../${trimmed.replace(/^\.+\//, '')}`;
  }

  function extractYouTubeId(url) {
    if (!url) {
      return null;
    }
    const patterns = [
      /youtu\.be\/([^?&]+)/i,
      /youtube\.com\/watch\?v=([^?&]+)/i,
      /youtube\.com\/embed\/([^?&]+)/i,
      /youtube\.com\/shorts\/([^?&]+)/i,
    ];
    for (let index = 0; index < patterns.length; index += 1) {
      const match = url.match(patterns[index]);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  function createVideoEmbed(url) {
    if (!url) {
      return null;
    }

    const trimmed = String(url).trim();
    if (!trimmed) {
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'video-frame';

    const youTubeId = extractYouTubeId(trimmed);
    if (youTubeId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${youTubeId}`;
      iframe.title = 'YouTube video player';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      wrapper.appendChild(iframe);
      return wrapper;
    }

    if (/\.(mp4|webm|ogg)(?:\?.*)?$/i.test(trimmed)) {
      const video = document.createElement('video');
      video.controls = true;
      video.src = resolveAssetUrl(trimmed);
      video.preload = 'metadata';
      wrapper.appendChild(video);
      return wrapper;
    }

    const iframe = document.createElement('iframe');
  iframe.src = resolveAssetUrl(trimmed);
    iframe.title = 'Embedded media player';
    iframe.setAttribute('frameborder', '0');
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    wrapper.appendChild(iframe);
    return wrapper;
  }

  function renderVideo(videoUrl) {
    const container = document.querySelector(selectors.video);
    if (!container) {
      return;
    }
    container.innerHTML = '';
    if (!videoUrl) {
      container.hidden = true;
      return;
    }
    const embed = createVideoEmbed(videoUrl);
    if (!embed) {
      container.hidden = true;
      return;
    }
    container.appendChild(embed);
    container.hidden = false;
  }

  function renderGallery(images) {
    const container = document.querySelector(selectors.gallery);
    if (!container) {
      return;
    }
    container.innerHTML = '';
    if (!Array.isArray(images) || !images.length) {
      container.hidden = true;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'detail-gallery-grid';

    images.forEach((entry, index) => {
      const figure = document.createElement('figure');
      figure.className = 'detail-gallery-item';
      const img = document.createElement('img');
      img.src = resolveAssetUrl(entry);
      img.loading = 'lazy';
      img.alt = `Gallery item ${index + 1}`;
      figure.appendChild(img);
      grid.appendChild(figure);
    });

    container.appendChild(grid);
    container.hidden = false;
  }

  function renderCollaborators(collaborators, type) {
    const section = document.querySelector(selectors.collaborators);
    const list = document.querySelector(selectors.collaboratorsList);
    if (!section || !list) {
      return;
    }

    list.innerHTML = '';
    if (!Array.isArray(collaborators) || !collaborators.length) {
      section.hidden = true;
      return;
    }

    const heading = section.querySelector('[data-collaborators-heading]');
    const headingTranslation = section.querySelector('[data-collaborators-heading-translation]');
    if (heading) {
      heading.textContent = type === 'article' ? 'Article Contributors' : 'Project Collaborators';
    }
    if (headingTranslation) {
      headingTranslation.textContent = type === 'article' ? 'المساهمون في المقال' : 'شركاء المشروع';
    }

    list.setAttribute('dir', 'auto');

    collaborators.forEach((collaborator) => {
      if (!collaborator) {
        return;
      }
      const item = document.createElement('li');
      item.className = 'collaborator-chip';
      item.dir = 'auto';
      const label = collaborator.displayName || collaborator.email || `#${collaborator.id}`;

      if (collaborator.profileSlug) {
        const link = document.createElement('a');
        link.href = `../Team/profile.html?slug=${encodeURIComponent(collaborator.profileSlug)}`;
        link.textContent = label;
        link.rel = 'noopener noreferrer';
        item.appendChild(link);
      } else {
        item.textContent = label;
      }

      list.appendChild(item);
    });

    section.hidden = false;
  }

  function applyAutoDirection(container) {
    if (!container) {
      return;
    }
    container.querySelectorAll('p, li, blockquote, h2, h3, h4, figcaption').forEach((element) => {
      if (!element.hasAttribute('dir')) {
        element.setAttribute('dir', 'auto');
      }
    });
  }

  function detectDominantDirection(...parts) {
    const combined = parts
      .filter(Boolean)
      .map((value) => String(value))
      .join(' ');
    const arabicMatches = combined.match(/[\u0600-\u06FF]/g) || [];
    const latinMatches = combined.match(/[A-Za-z]/g) || [];
    if (!arabicMatches.length && !latinMatches.length) {
      return null;
    }
    return arabicMatches.length >= latinMatches.length ? 'rtl' : 'ltr';
  }

  function toCssUrl(url) {
    if (!url) {
      return '';
    }
    const safe = String(url).replace(/"/g, '\"');
    return `url("${safe}")`;
  }

  async function loadSiteSettings() {
    if (typeof CyberXApi === 'undefined' || !CyberXApi.fetchSiteSettings) {
      return;
    }

    try {
      const settings = await CyberXApi.fetchSiteSettings();
      const heroUrl = settings && (settings.homeHeroImage || settings['home.heroImage']);
      if (heroUrl) {
        defaultHeroImage = toCssUrl(heroUrl);
      }
    } catch (error) {
      console.error('Failed to load site settings', error);
    }
  }

  let revealTriggered = false;

  function animateReveal() {
    if (revealTriggered) {
      return;
    }
    revealTriggered = true;

    const loader = document.querySelector(selectors.loader);
    const loaderText = document.querySelector(selectors.loaderText);
    const pageContent = document.querySelector(selectors.pageContent);

    if (!pageContent) {
      return;
    }

    if (!loader) {
      pageContent.style.display = 'block';
      return;
    }

    let progress = 1;
    const interval = setInterval(() => {
      progress += 1;
      if (loaderText) {
        loaderText.textContent = `${progress}%`;
      }

      if (progress >= 100) {
        clearInterval(interval);
        loader.style.opacity = '0';
        setTimeout(() => {
          loader.style.display = 'none';
          pageContent.style.display = 'block';
        }, 600);
      }
    }, 8);
  }

  function showError(messageEn, messageAr) {
    const errorNode = document.querySelector(selectors.error);
    if (!errorNode) {
      window.alert(messageEn);
      return;
    }
    errorNode.hidden = false;
    errorNode.innerHTML = '';

    const primary = document.createElement('p');
    primary.textContent = messageEn;
    errorNode.appendChild(primary);

    if (messageAr) {
      const translation = document.createElement('p');
      translation.className = 'translation';
      translation.dir = 'rtl';
      translation.lang = 'ar';
      translation.textContent = messageAr;
      errorNode.appendChild(translation);
    }
  }

  function setHeroBackground(element, coverImage) {
    if (!element) {
      return;
    }

    if (coverImage) {
      element.style.setProperty('--hero-image', toCssUrl(coverImage));
    } else if (defaultHeroImage) {
      element.style.setProperty('--hero-image', defaultHeroImage);
    } else {
      element.style.removeProperty('--hero-image');
    }
  }

  function renderContent(item, { type }) {
    const heroNode = document.querySelector(selectors.hero);
    const titleNode = document.querySelector(selectors.heroTitle);
    const subtitleNode = document.querySelector(selectors.heroSubtitle);
    const kickerNode = document.querySelector(selectors.kicker);
    const kickerTranslationNode = document.querySelector('[data-detail-kicker-translation]');
    const metaNode = document.querySelector(selectors.meta);
    const bodyNode = document.querySelector(selectors.body);

    if (kickerCopy[type]) {
      if (kickerNode) {
        kickerNode.textContent = kickerCopy[type].en;
      }
      if (kickerTranslationNode) {
        kickerTranslationNode.textContent = kickerCopy[type].ar;
      }
    }

    if (titleNode) {
      titleNode.textContent = item.title || '—';
      titleNode.dir = 'auto';
    }

    if (subtitleNode) {
      if (item.summary) {
        if (containsHtml(item.summary)) {
          subtitleNode.innerHTML = item.summary;
        } else {
          subtitleNode.textContent = item.summary;
        }
        subtitleNode.dir = 'auto';
        subtitleNode.hidden = false;
      } else {
        subtitleNode.hidden = true;
      }
    }

    const metaSegments = [];
    if (item.authorName) {
      metaSegments.push({
        en: `By ${item.authorName}`,
        ar: `بقلم ${item.authorName}`,
      });
    }
    const when = item.publishedAt || item.updatedAt || item.createdAt;
    if (when) {
      const formatted = formatDate(when);
      if (formatted) {
        metaSegments.push({
          en: `Updated ${formatted.en}`,
          ar: `آخر تحديث: ${formatted.ar}`,
        });
      }
    }

    renderMeta(metaNode, metaSegments);

    if (bodyNode) {
      const content = item.content || item.description || item.summary;
      if (content) {
        bodyNode.innerHTML = content;
      } else {
        bodyNode.innerHTML = '<p>No detailed content yet.<span class="translation" dir="rtl" lang="ar">لم يتم إضافة محتوى تفصيلي بعد.</span></p>';
      }

      bodyNode.setAttribute('dir', 'auto');
      applyAutoDirection(bodyNode);

      const detectedDirection = detectDominantDirection(item.title, item.summary, bodyNode.textContent);
      document.body.dataset.direction = detectedDirection || 'ltr';
    }

    renderVideo(item.videoUrl);
    renderGallery(item.galleryImages);
    renderCollaborators(item.collaborators, type);

    setHeroBackground(heroNode, item.coverImage);

    if (item.title) {
      let suffix = 'Cyber X';
      if (type === 'project') {
        suffix = 'Cyber X Projects';
      } else if (type === 'article') {
        suffix = 'Cyber X Articles';
      } else if (type === 'lecture') {
        suffix = 'Cyber X Lectures';
      }
      document.title = `${item.title} – ${suffix}`;
    }
  }

  async function fetchContent(type, slugOrId) {
    if (type === 'project') {
      return CyberXApi.fetchProjectBySlug(slugOrId);
    }
    if (type === 'article') {
      return CyberXApi.fetchArticleBySlug(slugOrId);
    }
    if (type === 'lecture') {
      return CyberXApi.fetchLectureById(slugOrId);
    }
    throw new Error('نوع المحتوى غير مدعوم.');
  }

  function setupTabMenu() {
    const tabButton = document.getElementById('tab-button');
    const tabMenu = document.getElementById('tab-menu');

    if (!tabButton || !tabMenu) {
      return;
    }

    tabButton.addEventListener('click', () => {
      tabMenu.classList.toggle('show');
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    setupTabMenu();

    const params = new URLSearchParams(window.location.search);
    const body = document.body;
    const type = body.dataset.contentType;
    const slug = params.get('slug') || params.get('id');
    const allowDraft = params.get('preview') === 'true';

    if (!type || !slug) {
      showError('Unable to determine which content to display.', 'تعذر تحديد المحتوى المطلوب عرضه.');
      animateReveal();
      return;
    }

    try {
      await loadSiteSettings();
      const contentItem = await fetchContent(type, slug);

      if (!contentItem) {
        showError('We could not find the requested content.', 'لم يتم العثور على المحتوى المطلوب.');
        return;
      }

      if (!allowDraft && contentItem.isPublished === 0) {
        showError('This content is not published yet.', 'هذا المحتوى غير منشور بعد.');
        return;
      }

      renderContent(contentItem, { type });
    } catch (error) {
      console.error('Failed to load content detail', error);
      showError('Something went wrong while loading the content.', 'حدث خطأ أثناء تحميل المحتوى.');
    } finally {
      animateReveal();
    }
  });
})();
