/* global CyberXApi */
(function initContentLists() {
  if (typeof window === 'undefined') {
    return;
  }

  function toBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return Boolean(value);
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

  function isExternal(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  function getTemplate(container) {
    const templateId = container.dataset.templateId || 'content-card-template';
    return document.getElementById(templateId);
  }

  function mapItemForSource(source, item) {
    if (!item) {
      return null;
    }

    if (source === 'projects' || source === 'articles') {
      const link = item.detailUrl || '#';
      return {
        title: item.title,
        summary: cleanText(item.summary || item.content, 220),
        href: link,
        cta: 'اقرأ المزيد',
        openInNewTab: isExternal(link),
        coverImage: item.coverImage,
        imageAlt: item.title,
      };
    }

    if (source === 'lectures') {
      const link = item.videoUrl || item.resourceUrl || '#';
      return {
        title: item.title,
        summary: cleanText(item.description, 220),
        href: link,
        cta: 'شاهد الدرس',
        openInNewTab: isExternal(link),
        coverImage: item.coverImage,
        imageAlt: item.title,
      };
    }

    return null;
  }

  function createCard(template, data) {
    if (!template || !template.content || !template.content.firstElementChild) {
      return null;
    }
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.article-card');
    const titleElement = card.querySelector('h3');
    const summaryElement = card.querySelector('p');
    const linkElement = card.querySelector('a');
    const imageElement = card.querySelector('img');

    titleElement.textContent = data.title || '';
    summaryElement.textContent = data.summary || '';
    linkElement.textContent = data.cta || linkElement.textContent || 'اقرأ المزيد';
    linkElement.href = data.href || '#';
    if (data.openInNewTab) {
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
    } else {
      linkElement.removeAttribute('target');
      linkElement.removeAttribute('rel');
    }

    card.dataset.dynamicCard = 'true';

    if (imageElement) {
      if (data.coverImage) {
        imageElement.src = data.coverImage;
        imageElement.alt = data.imageAlt || data.title || '';
      } else {
        imageElement.remove();
      }
    }

    return card;
  }

  function renderContainer(container, items, source) {
    const template = getTemplate(container);
    const viewAll = container.querySelector('[data-static="view-all"]');
    const placeholders = container.querySelectorAll('[data-placeholder]');
    placeholders.forEach((node) => node.remove());
    container.querySelectorAll('[data-dynamic-card="true"]').forEach((node) => node.remove());
    container.querySelectorAll('[data-dynamic="empty"]').forEach((node) => node.remove());

    if (!items.length) {
      const message = container.dataset.emptyText || 'لا توجد بيانات متاحة.';
      const paragraph = document.createElement('p');
      paragraph.className = 'empty-state';
      paragraph.dataset.dynamic = 'empty';
      paragraph.textContent = message;
      container.appendChild(paragraph);
      return;
    }

    items.forEach((item) => {
      const cardData = mapItemForSource(source, item);
      if (!cardData) {
        return;
      }
      const card = createCard(template, cardData);
      if (!card) {
        return;
      }
      if (viewAll) {
        container.insertBefore(card, viewAll);
      } else {
        container.appendChild(card);
      }
    });
  }

  async function fetchForSource(source, params) {
    if (typeof CyberXApi === 'undefined') {
      throw new Error('CyberXApi غير متوفر');
    }

    if (source === 'projects') {
      return CyberXApi.fetchProjects(params);
    }
    if (source === 'articles') {
      return CyberXApi.fetchArticles(params);
    }
    if (source === 'lectures') {
      return CyberXApi.fetchLectures(params);
    }

    throw new Error(`مصدر غير معروف: ${source}`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('[data-content-source]');

    containers.forEach(async (container) => {
      const source = container.dataset.contentSource;
      if (!source) {
        return;
      }

      const limit = container.dataset.limit ? Number(container.dataset.limit) : undefined;
      const includeDrafts = toBoolean(container.dataset.includeDrafts);

      const params = {};
      if (includeDrafts) {
        params.includeDrafts = 'true';
      }
      if (container.dataset.authorSlug) {
        params.authorSlug = container.dataset.authorSlug;
      }
      if (container.dataset.authorId) {
        params.authorId = container.dataset.authorId;
      }

      try {
        const data = await fetchForSource(source, params);
        let items = Array.isArray(data) ? data : [];
        if (typeof limit === 'number') {
          items = items.slice(0, limit);
        }
        renderContainer(container, items, source);
      } catch (error) {
        console.error(`فشل تحميل المحتوى للمصدر ${source}`, error);
      }
    });
  });
})();
