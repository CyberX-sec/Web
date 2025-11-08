/* global CyberXApi */
(function initProjectsPage() {
  if (typeof window === 'undefined') {
    return;
  }

  function updateHero(profile) {
    const heroTitle = document.querySelector('.hero h2');
    const heroSubtitleAr = document.querySelector('.hero p:not([lang])');
    const heroSubtitleEn = document.querySelector('.hero p[lang="en"]');

    if (heroTitle && profile.displayName) {
      heroTitle.textContent = profile.displayName;
    }

    if (heroSubtitleAr && profile.profileHeadline) {
      heroSubtitleAr.textContent = profile.profileHeadline;
    }

    if (heroSubtitleEn && profile.displayName) {
      heroSubtitleEn.textContent = `Projects by ${profile.displayName}`;
      heroSubtitleEn.setAttribute('lang', 'en');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const authorSlug = params.get('author') || params.get('authorSlug');
    if (!authorSlug) {
      return;
    }

    const container = document.getElementById('projects-list');
    if (container) {
      container.dataset.authorSlug = authorSlug;
      container.dataset.emptyText = 'لا توجد مشاريع منشورة لهذا العضو حالياً.';
    }

    if (typeof CyberXApi === 'undefined' || !CyberXApi.fetchTeamProfileBySlug) {
      return;
    }

    try {
      const profile = await CyberXApi.fetchTeamProfileBySlug(authorSlug);
      if (!profile) {
        return;
      }

      updateHero(profile);
      document.title = `${profile.displayName || 'Cyber X'} – Projects`;
    } catch (error) {
      console.error('Failed to load author profile for projects page', error);
    }
  });
})();
