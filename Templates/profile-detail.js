/* global CyberXApi */
(function initProfileDetailPage() {
  if (typeof window === 'undefined') {
    return;
  }

  const FALLBACK_AVATAR = '../Team-images/n2.JPEG';

  const selectors = {
    loader: '#loader',
    loaderText: '#loader-text',
    pageContent: '#page-content',
    name: '[data-profile-name]',
    headline: '[data-profile-headline]',
    role: '[data-profile-role]',
    roleTranslation: '[data-profile-role-translation]',
    hero: '.profile-hero',
    avatar: '[data-profile-avatar]',
    display: '[data-profile-display]',
    bio: '[data-profile-bio]',
    badges: '[data-profile-badges]',
    certificates: '[data-profile-certificates]',
    nav: '[data-profile-nav]',
  };

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

  function clearContainer(container) {
    if (!container) {
      return;
    }
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  function createTag(text) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = text;
    return tag;
  }

  function parseCertificate(entry) {
    if (!entry) {
      return null;
    }
    const [label, link] = String(entry)
      .split('|')
      .map((part) => part.trim());

    if (!label) {
      return null;
    }

    if (link) {
      const anchor = document.createElement('a');
      anchor.className = 'tag';
      anchor.href = link;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = label;
      return anchor;
    }

    return createTag(label);
  }

  function renderTags(container, items, parser = createTag) {
    if (!container) {
      return;
    }

    clearContainer(container);

    if (!Array.isArray(items) || !items.length) {
      container.hidden = true;
      return;
    }

    container.hidden = false;
    items.forEach((item) => {
      const node = parser(item);
      if (node) {
        container.appendChild(node);
      }
    });
  }

  function setHeroImage(element, url) {
    if (!element) {
      return;
    }
    if (url) {
      const safe = String(url).replace(/"/g, '\\"');
      element.style.setProperty('--hero-image', `url("${safe}")`);
    } else {
      element.style.removeProperty('--hero-image');
    }
  }

  function renderProfile(profile) {
    const nameNode = document.querySelector(selectors.name);
    const headlineNode = document.querySelector(selectors.headline);
    const roleNode = document.querySelector(selectors.role);
    const roleTranslationNode = document.querySelector(selectors.roleTranslation);
    const heroNode = document.querySelector(selectors.hero);
    const avatarNode = document.querySelector(selectors.avatar);
    const displayNode = document.querySelector(selectors.display);
    const bioNode = document.querySelector(selectors.bio);
    const badgesContainer = document.querySelector(selectors.badges);
    const certificatesContainer = document.querySelector(selectors.certificates);

    if (nameNode) {
      nameNode.textContent = profile.displayName || 'Cyber X Member';
    }

    if (displayNode) {
      displayNode.textContent = profile.displayName || 'Cyber X Member';
    }

    if (headlineNode) {
      if (profile.profileHeadline) {
        headlineNode.textContent = profile.profileHeadline;
        headlineNode.hidden = false;
      } else {
        headlineNode.hidden = true;
      }
    }

    if (roleNode) {
      roleNode.textContent = 'CYBER X MEMBER';
    }
    if (roleTranslationNode) {
      roleTranslationNode.textContent = 'عضو في فريق Cyber X';
    }

    if (avatarNode) {
      avatarNode.src = profile.avatarUrl || FALLBACK_AVATAR;
      avatarNode.alt = profile.displayName || 'Cyber X Member';
      avatarNode.addEventListener(
        'error',
        () => {
          avatarNode.src = FALLBACK_AVATAR;
        },
        { once: true }
      );
    }

    if (bioNode) {
      const bioText = profile.bio || '';
      bioNode.textContent = bioText.trim() || 'لم يتم إضافة نبذة تعريفية بعد.';
    }

    renderTags(badgesContainer, profile.badges);
    renderTags(certificatesContainer, profile.certificates, parseCertificate);

    setHeroImage(heroNode, profile.profileHeroImage);

    buildNavigation(profile);

    if (profile.displayName) {
      document.title = `${profile.displayName} – Cyber X Team`;
    }
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url || '');
  }

  function parseContactEntry(entry) {
    if (!entry) {
      return null;
    }
    const [label, link] = String(entry)
      .split('|')
      .map((part) => part.trim());

    if (!label || !link) {
      return null;
    }

    return { label, link };
  }

  function buildNavigation(profile) {
    const nav = document.querySelector(selectors.nav);
    if (!nav) {
      return;
    }

    while (nav.firstChild) {
      nav.removeChild(nav.firstChild);
    }

    const links = [];

    links.push({
      label: 'Homepage',
      translation: 'الصفحة الرئيسية',
      href: '../index.html',
    });

    if (profile.profileSlug) {
      links.push({
        label: 'Projects',
        translation: 'مشاريع العضو',
        href: `../Projects/Main.html?author=${encodeURIComponent(profile.profileSlug)}`,
      });
    } else {
      links.push({
        label: 'Projects',
        translation: 'المشاريع',
        href: '../Projects/Main.html',
      });
    }

    if (Array.isArray(profile.profileContactLinks)) {
      profile.profileContactLinks.forEach((entry) => {
        const parsed = parseContactEntry(entry);
        if (!parsed) {
          return;
        }
        links.push({
          label: parsed.label,
          href: parsed.link,
          external: isExternal(parsed.link),
        });
      });
    }

    links.forEach((link) => {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.className = 'profile-nav-link';
      anchor.textContent = link.label;
      if (link.external) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }

      if (link.translation) {
        const translation = document.createElement('span');
        translation.className = 'translation';
        translation.dir = 'rtl';
        translation.lang = 'ar';
        translation.textContent = link.translation;
        anchor.appendChild(translation);
      }

      nav.appendChild(anchor);
    });
  }

  function showError(message) {
    const nameNode = document.querySelector(selectors.name);
    const headlineNode = document.querySelector(selectors.headline);
    const bioNode = document.querySelector(selectors.bio);
    if (nameNode) {
      nameNode.textContent = 'الملف غير متوفر';
    }
    if (headlineNode) {
      headlineNode.hidden = true;
    }
    if (bioNode) {
      bioNode.textContent = message || 'تعذر تحميل الملف الشخصي.';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug || typeof CyberXApi === 'undefined' || !CyberXApi.fetchTeamProfileBySlug) {
      showError('لم يتم العثور على الملف المطلوب.');
      animateReveal();
      return;
    }

    try {
      const profile = await CyberXApi.fetchTeamProfileBySlug(slug);
      renderProfile(profile || {});
    } catch (error) {
      console.error('Failed to load team profile', error);
      showError('تعذر تحميل الملف الشخصي. حاول لاحقاً.');
    } finally {
      animateReveal();
    }
  });
})();
