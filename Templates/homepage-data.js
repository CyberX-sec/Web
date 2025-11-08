/* global CyberXApi */
(function hydrateHomepage() {
  if (typeof window === 'undefined') {
    return;
  }

  const HOME_SECTION_KEYS = ['projects', 'lectures', 'articles'];

  const SECTION_CONFIG = {
    projects: {
      selector: '#homepage-projects',
      limit: 4,
      emptyMessage: 'لا توجد مشاريع منشورة حالياً.',
      fetcher: () => CyberXApi.fetchProjects(),
      mapItem: (project) => {
        if (!project) {
          return null;
        }
        const link = project.detailUrl || '#';
        return {
          title: project.title,
          summary: cleanText(project.summary || project.content, 180),
          href: link,
          cta: 'اقرأ المزيد',
          openInNewTab: isExternalLink(link),
        };
      },
    },
    lectures: {
      selector: '#homepage-lectures',
    },
    articles: {
      selector: '#homepage-articles',
      limit: 2,
      emptyMessage: 'لا توجد مقالات منشورة حالياً.',
      fetcher: () => CyberXApi.fetchArticles(),
      mapItem: (article) => {
        if (!article) {
          return null;
        }
        const link = article.detailUrl || '#';
        return {
          title: article.title,
          summary: cleanText(article.summary || article.content, 180),
          href: link,
          cta: 'اقرأ المزيد',
          openInNewTab: isExternalLink(link),
        };
      },
    },
  };

  function isExternalLink(url) {
    if (!url) {
      return false;
    }
    return /^https?:\/\//i.test(url);
  }

  function cleanText(value, maxLength) {
    if (!value) {
      return '';
    }
    const withoutHtml = String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!maxLength || withoutHtml.length <= maxLength) {
      return withoutHtml;
    }
    return `${withoutHtml.slice(0, maxLength).trim()}…`;
  }

  function cleanSetting(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  function getSetting(settings, key) {
    if (!settings || typeof settings !== 'object') {
      return '';
    }

    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      return settings[key];
    }

    const segments = key.split('.');
    if (segments[0] === 'home' && segments[1] === 'sections' && segments.length >= 4) {
      const sectionKey = segments[2];
      const fieldKey = segments.slice(3).join('.');
      if (
        settings.homeSections &&
        settings.homeSections[sectionKey] &&
        Object.prototype.hasOwnProperty.call(settings.homeSections[sectionKey], fieldKey)
      ) {
        return settings.homeSections[sectionKey][fieldKey];
      }
    }

    return '';
  }

  function updateElementText(element, value) {
    if (!element) {
      return;
    }
    const fallback = element.dataset.defaultText || element.textContent;
    element.textContent = value || fallback;
  }

  function updateLinkElement(element, href) {
    if (!element) {
      return;
    }
    const fallbackHref = element.dataset.defaultHref || element.getAttribute('href') || '#';
    const targetHref = href || fallbackHref;
    element.setAttribute('href', targetHref);

    if (isExternalLink(targetHref)) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    } else {
      element.removeAttribute('target');
      element.removeAttribute('rel');
    }
  }

  function applySectionCopy(sectionKey, settings) {
    const title = cleanSetting(getSetting(settings, `home.sections.${sectionKey}.title`));
    updateElementText(document.querySelector(`[data-section-heading="${sectionKey}"]`), title);

    const viewAllTitle = cleanSetting(
      getSetting(settings, `home.sections.${sectionKey}.viewAllTitle`)
    );
    updateElementText(
      document.querySelector(`[data-section-view-all-title="${sectionKey}"]`),
      viewAllTitle
    );

    const viewAllCta = cleanSetting(
      getSetting(settings, `home.sections.${sectionKey}.viewAllCta`)
    );
    const ctaElement = document.querySelector(
      `[data-section-view-all-cta="${sectionKey}"]`
    );
    updateElementText(ctaElement, viewAllCta);

    const viewAllLink = cleanSetting(
      getSetting(settings, `home.sections.${sectionKey}.viewAllLink`)
    );
    updateLinkElement(ctaElement, viewAllLink);
  }

  function createCardFromTemplate(data) {
    const template = document.getElementById('content-card-template');
    if (!template || !template.content || !template.content.firstElementChild) {
      return null;
    }

    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.article-card');
    const titleElement = card.querySelector('h3');
    const summaryElement = card.querySelector('p');
    const linkElement = card.querySelector('a');

    titleElement.textContent = data.title || '';
    summaryElement.textContent = data.summary || '';
    linkElement.textContent = data.cta || 'اقرأ المزيد';
    linkElement.href = data.href || '#';

    if (data.openInNewTab) {
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
    } else {
      linkElement.removeAttribute('target');
      linkElement.removeAttribute('rel');
    }

    card.dataset.dynamicCard = 'true';
    return card;
  }

  function removePlaceholders(container) {
    if (!container) {
      return;
    }
    container.querySelectorAll('[data-placeholder]').forEach((node) => node.remove());
  }

  function ensureEmptyState(container, message) {
    if (!container || !message) {
      return;
    }
    const previousState = container.querySelector('[data-dynamic="empty"]');
    if (previousState) {
      previousState.remove();
    }

    const paragraph = document.createElement('p');
    paragraph.className = 'empty-state';
    paragraph.dataset.dynamic = 'empty';
    paragraph.textContent = message;
    container.appendChild(paragraph);
  }

  function parseHomeSectionsOrder(value) {
    if (!value) {
      return [...HOME_SECTION_KEYS];
    }

    let order = [];
    if (Array.isArray(value)) {
      order = value.map((item) => String(item || '').trim());
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            order = parsed.map((item) => String(item || '').trim());
          }
        } catch (error) {
          order = [];
        }
      }

      if (!order.length && trimmed) {
        order = trimmed.split(',').map((item) => item.trim());
      }
    }

    const filtered = order.filter((key) => HOME_SECTION_KEYS.includes(key));
    HOME_SECTION_KEYS.forEach((key) => {
      if (!filtered.includes(key)) {
        filtered.push(key);
      }
    });

    return filtered.length ? filtered : [...HOME_SECTION_KEYS];
  }

  function reorderHomeSections(order) {
    const root = document.querySelector('[data-home-sections-root]');
    if (!root) {
      return;
    }

    const fragments = {};
    HOME_SECTION_KEYS.forEach((key) => {
      const node = root.querySelector(`[data-home-section="${key}"]`);
      if (node) {
        fragments[key] = node;
      }
    });

    order.forEach((key) => {
      const node = fragments[key];
      if (node) {
        root.appendChild(node);
      }
    });
  }

  function applyHomeSectionsLayout(settings) {
    const rawOrder =
      (settings && settings.homeSectionsOrder) || getSetting(settings, 'home.sections.order');
    const order = parseHomeSectionsOrder(rawOrder);
    reorderHomeSections(order);

    HOME_SECTION_KEYS.forEach((sectionKey) => {
      applySectionCopy(sectionKey, settings);
    });
  }

  async function renderSection(sectionKey, config, settings) {
    applySectionCopy(sectionKey, settings);

    if (!config || typeof config.selector !== 'string') {
      return;
    }

    const container = document.querySelector(config.selector);
    if (!container || typeof config.fetcher !== 'function') {
      return;
    }

    const viewAllCard = container.querySelector('[data-static="view-all"]');

    try {
      const data = await config.fetcher();
      const list = Array.isArray(data) ? data : [];
      const limited = typeof config.limit === 'number' ? list.slice(0, config.limit) : list;

      removePlaceholders(container);
      container.querySelectorAll('[data-dynamic="empty"]').forEach((node) => node.remove());
      container.querySelectorAll('[data-dynamic-card="true"]').forEach((node) => node.remove());

      if (!limited.length) {
        ensureEmptyState(container, config.emptyMessage);
        return;
      }

      limited.forEach((item) => {
        const cardData = config.mapItem ? config.mapItem(item) : null;
        if (!cardData) {
          return;
        }
        const card = createCardFromTemplate(cardData);
        if (!card) {
          return;
        }
        if (viewAllCard) {
          container.insertBefore(card, viewAllCard);
        } else {
          container.appendChild(card);
        }
      });
    } catch (error) {
      console.error(`Failed to load section ${sectionKey}`, error);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    let settings = {};

    try {
      if (
        window.CyberXSiteBranding &&
        typeof window.CyberXSiteBranding.ensureApplied === 'function'
      ) {
        settings = (await window.CyberXSiteBranding.ensureApplied()) || {};
      } else if (typeof CyberXApi !== 'undefined' && CyberXApi.fetchSiteSettings) {
        settings = (await CyberXApi.fetchSiteSettings()) || {};
      }
    } catch (error) {
      console.error('Failed to load homepage settings', error);
      settings = settings || {};
    }

    applyHomeSectionsLayout(settings);

    const tasks = HOME_SECTION_KEYS.map((key) => renderSection(key, SECTION_CONFIG[key], settings));
    await Promise.all(tasks).catch((error) => {
      console.error('Failed to hydrate some homepage sections', error);
    });
  });
})();
