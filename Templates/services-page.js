(function initServicesPage() {
  if (typeof window === 'undefined') {
    return;
  }

  const servicesCatalog = [
    {
      id: 'esp32-flasher',
      title: 'ESP32 Flasher',
      description: 'Flash and set up your ESP32 boards with ease',
      href: './tools/cyberx-flasher.html',
      cta: 'Start Flashing',
      badge: 'Micro-Controllers',
      state: 'live',
      tags: ['ESP32', 'Firmware', 'USB Serial'],
  credit: 'Built by Mohammed Al-Baroudi',
    },
    {
      id: 'password-auditor',
      title: 'Password Strength Auditor',
      description:
        'Instantly evaluate password strength, entropy, and guess resistance with clear hardening guidance.',
      href: './tools/password-auditor.html',
      cta: 'Launch Tool',
      badge: 'Account Defense',
      state: 'live',
      tags: ['Password Hygiene', 'Entropy', 'Guidance'],
      credit: 'Built by Abdallah Yasir',
    },
    {
      id: 'hash-lab',
      title: 'Secure Hash Lab',
      description: 'Generate SHA digests for text or files to validate integrity before distribution.',
      href: './tools/hash-lab.html',
      cta: 'Generate Hash',
      badge: 'Integrity Monitoring',
      state: 'live',
      tags: ['SHA-256', 'SHA-512', 'File Check'],
      credit: 'Built by Abdallah Yasir',
    },
    {
      id: 'jwt-decoder',
      title: 'JWT Token Inspector',
      description:
        'Decode and validate JSON Web Tokens locally to review headers, payloads, and signature coverage.',
      href: './tools/jwt-decoder.html',
      cta: 'Decode Now',
      badge: 'Protocol Analysis',
      state: 'live',
      tags: ['JWT', 'Decode', 'Security Review'],
      credit: 'Built by Abdallah Yasir',
    },
  ];

  function getTemplate() {
    const template = document.getElementById('service-card-template');
    if (!template || !template.content || !template.content.firstElementChild) {
      return null;
    }
    return template;
  }

  function applyState(element, value) {
    if (!element) {
      return;
    }
    if (!value) {
      element.remove();
      return;
    }

    let label = '';
    let className = '';

    if (value === 'live') {
      label = 'متاح الآن';
      className = 'state-live';
    } else if (value === 'coming-soon') {
      label = 'قريباً';
      className = 'state-coming-soon';
    } else {
      label = value;
    }

    element.textContent = label;
    if (className) {
      element.classList.remove('state-live', 'state-coming-soon');
      element.classList.add(className);
    }
    element.hidden = false;
  }

  function populateMeta(listElement, list) {
    if (!listElement) {
      return;
    }

    listElement.innerHTML = '';
    const items = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!items.length) {
      listElement.remove();
      return;
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      listElement.appendChild(li);
    });
  }

  function createCard(template, service) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.service-card');
    const badge = card.querySelector('.service-card__badge');
    const title = card.querySelector('h3');
    const description = card.querySelector('p');
    const meta = card.querySelector('.service-card__meta');
    const cta = card.querySelector('.service-card__cta');
    const stateBadge = card.querySelector('.service-card__state');
    const credit = card.querySelector('[data-service-credit]');
    const footer = card.querySelector('.service-card__footer');

    card.dataset.serviceId = service.id || '';
    if (service.state) {
      card.dataset.state = service.state;
    } else {
      delete card.dataset.state;
    }

    if (badge) {
      if (service.badge) {
        badge.textContent = service.badge;
        badge.hidden = false;
      } else {
        badge.remove();
      }
    }

    if (title) {
      title.textContent = service.title || '';
    }

    if (description) {
      description.textContent = service.description || '';
    }

    populateMeta(meta, service.tags);

    if (cta) {
      const label = service.cta || cta.textContent || 'استكشف الخدمة';
      cta.textContent = '';
      const span = document.createElement('span');
      span.textContent = label;
      cta.appendChild(span);
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '›';
      cta.appendChild(arrow);

      cta.href = service.href || '#';
      if (service.openInNewTab) {
        cta.target = '_blank';
        cta.rel = 'noopener noreferrer';
      } else {
        cta.removeAttribute('target');
        cta.removeAttribute('rel');
      }
    }

    applyState(stateBadge, service.state);

    if (credit) {
      const creditText = service.credit || (service.maker ? `صنع بواسطة ${service.maker}` : '');
      if (creditText) {
        credit.textContent = creditText;
        credit.hidden = false;
      } else {
        credit.hidden = true;
      }
    }

    if (footer) {
      const shouldHideFooter = !credit || credit.hidden;
      footer.hidden = shouldHideFooter;
    }

    return card;
  }

  function renderServices(list) {
    const container = document.getElementById('services-list');
    if (!container) {
      return;
    }

    const template = getTemplate();
    if (!template) {
      console.warn('service-card-template غير متاح.');
      return;
    }

    container.querySelectorAll('[data-placeholder]').forEach((node) => node.remove());
    container.querySelectorAll('[data-dynamic-service]').forEach((node) => node.remove());
    container.querySelectorAll('.empty-state').forEach((node) => node.remove());

    if (!list.length) {
      const message = container.dataset.emptyText || 'لا توجد خدمات منشورة حالياً.';
      const paragraph = document.createElement('p');
      paragraph.className = 'empty-state';
      paragraph.textContent = message;
      container.appendChild(paragraph);
      return;
    }

    list.forEach((service) => {
      const card = createCard(template, service);
      if (!card) {
        return;
      }
      card.dataset.dynamicService = 'true';
      container.appendChild(card);
    });
  }

  function refreshCatalog() {
    renderServices(servicesCatalog);
  }

  window.CyberXServices = {
    list() {
      return servicesCatalog.slice();
    },
    add(service) {
      if (!service || typeof service !== 'object') {
        return;
      }
      servicesCatalog.push(service);
      refreshCatalog();
    },
    render(services) {
      if (Array.isArray(services)) {
        renderServices(services);
        return;
      }
      refreshCatalog();
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    refreshCatalog();
  });
})();
