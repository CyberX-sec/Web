/* global CyberXApi */
(function initSiteBranding() {
  if (typeof window === 'undefined') {
    return;
  }

  const state = {
    applied: false,
    pending: null,
    settings: null,
  };

  function toCssUrl(url) {
    if (!url) {
      return '';
    }
    const safe = String(url).replace(/"/g, '\"');
    return `url("${safe}")`;
  }

  function applyTextPreference(element, value) {
    if (!element) {
      return;
    }
    const fallback = element.dataset.defaultText || element.textContent;
    element.textContent = value || fallback;
  }

  function applyEmailPreference(element, value) {
    if (!element) {
      return;
    }
    const fallback = element.dataset.defaultText || element.textContent;
    if (value) {
      const label = element.dataset.label || '';
      element.textContent = `${label}${value}`;
    } else {
      element.textContent = fallback;
    }
  }

  function applyLinkPreference(element, value) {
    if (!element) {
      return;
    }
    const fallbackHref = element.dataset.defaultHref || element.getAttribute('href') || '#';
    element.setAttribute('href', value || fallbackHref);
    if (element.dataset.defaultText) {
      element.textContent = element.dataset.defaultText;
    }
  }

  function applySettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return;
    }

    const hero = document.querySelector('.hero');
    const heroUrl = settings.homeHeroImage || settings['home.heroImage'];
    if (hero && heroUrl) {
      hero.style.setProperty('--homepage-hero-image', toCssUrl(heroUrl));
    }

    applyTextPreference(
      document.querySelector('[data-home-hero-title]'),
      settings['home.heroTitle'] || settings.homeHeroTitle
    );
    applyTextPreference(
      document.querySelector('[data-home-hero-line-ar]'),
      settings['home.heroLineAr'] || settings.homeHeroLineAr
    );
    applyTextPreference(
      document.querySelector('[data-home-hero-line-en]'),
      settings['home.heroLineEn'] || settings.homeHeroLineEn
    );

    applyTextPreference(
      document.querySelector('[data-home-about-heading]'),
      settings['home.about.heading'] || settings.homeAboutHeading
    );
    applyTextPreference(
      document.querySelector('[data-home-about-text-ar]'),
      settings['home.about.textAr'] || settings.homeAboutTextAr
    );
    applyTextPreference(
      document.querySelector('[data-home-about-text-en]'),
      settings['home.about.textEn'] || settings.homeAboutTextEn
    );

    applyTextPreference(
      document.querySelector('[data-home-vision-heading]'),
      settings['home.vision.heading'] || settings.homeVisionHeading
    );
    applyTextPreference(
      document.querySelector('[data-home-vision-text-ar]'),
      settings['home.vision.textAr'] || settings.homeVisionTextAr
    );
    applyTextPreference(
      document.querySelector('[data-home-vision-text-en]'),
      settings['home.vision.textEn'] || settings.homeVisionTextEn
    );

    const contactEmail = settings['contact.email'] || settings.contactEmail;
    const contactGithub = settings['contact.github'] || settings.contactGithub;
    const contactTelegram = settings['contact.telegram'] || settings.contactTelegram;

    applyEmailPreference(document.querySelector('[data-contact-email]'), contactEmail);
    applyLinkPreference(document.querySelector('[data-contact-github]'), contactGithub);
    applyLinkPreference(document.querySelector('[data-contact-telegram]'), contactTelegram);
  }

  async function fetchSettings() {
    if (typeof CyberXApi === 'undefined' || !CyberXApi.fetchSiteSettings) {
      return null;
    }
    try {
      const settings = await CyberXApi.fetchSiteSettings();
      return settings || {};
    } catch (error) {
      console.error('Failed to fetch site settings', error);
      return null;
    }
  }

  async function ensureApplied() {
    if (state.applied && state.settings) {
      applySettings(state.settings);
      return state.settings;
    }

    if (!state.pending) {
      state.pending = fetchSettings()
        .then((settings) => {
          state.settings = settings || {};
          applySettings(state.settings);
          state.applied = true;
          return state.settings;
        })
        .finally(() => {
          state.pending = null;
        });
    }

    return state.pending;
  }

  window.CyberXSiteBranding = {
    ensureApplied,
    apply: applySettings,
    getSettings() {
      return state.settings;
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensureApplied().catch((error) => {
      console.error('Failed to apply site branding', error);
    });
  });
})();
