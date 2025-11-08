(function initTeamProfiles() {
  if (typeof window === 'undefined') {
    return;
  }

  const FALLBACK_IMAGE = 'Team-images/n2.JPEG';
  const DEFAULT_SUMMARY = 'عضو في فريق Cyber X';

  function truncate(value, maxLength) {
    if (!value) {
      return '';
    }
    const text = String(value).trim();
    if (!maxLength || text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength).trim()}…`;
  }

  function clearPlaceholders(container) {
    container.querySelectorAll('[data-placeholder]').forEach((node) => node.remove());
  }

  function showEmptyState(container) {
    clearPlaceholders(container);
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = 'لا توجد ملفات أعضاء منشورة حالياً.';
    container.appendChild(message);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('team-grid');
    const template = document.getElementById('team-member-template');

    if (!grid || !template || typeof CyberXApi === 'undefined' || !CyberXApi.fetchTeamProfiles) {
      return;
    }

    try {
      const profiles = await CyberXApi.fetchTeamProfiles();
      if (!Array.isArray(profiles) || !profiles.length) {
        showEmptyState(grid);
        return;
      }

      clearPlaceholders(grid);

      profiles.forEach((profile) => {
        if (!profile || !profile.profileSlug) {
          return;
        }
        const fragment = template.content.cloneNode(true);
        const link = fragment.querySelector('[data-profile-link]');
        const image = link.querySelector('img');
        const nameElement = link.querySelector('h3');
        const summaryElement = link.querySelector('p');

        const profileUrl = `Team/profile.html?slug=${encodeURIComponent(profile.profileSlug)}`;
        link.href = profileUrl;
        link.dataset.profileSlug = profile.profileSlug;

        if (image) {
          image.src = profile.avatarUrl || FALLBACK_IMAGE;
          image.alt = profile.displayName || DEFAULT_SUMMARY;
          image.addEventListener(
            'error',
            () => {
              image.src = FALLBACK_IMAGE;
            },
            { once: true }
          );
        }

        if (nameElement) {
          nameElement.textContent = profile.displayName || 'Cyber X Member';
        }

        if (summaryElement) {
          const headline = profile.profileHeadline || profile.bio;
          summaryElement.textContent = truncate(headline, 120) || DEFAULT_SUMMARY;
        }

        grid.appendChild(fragment);
      });
    } catch (error) {
      console.error('Failed to load team profiles', error);
      const placeholder = grid.querySelector('[data-placeholder]');
      if (placeholder) {
        const messageNode = placeholder.querySelector('p');
        if (messageNode) {
          messageNode.textContent = 'تعذر تحميل ملفات الفريق. حاول لاحقاً.';
        }
      } else {
        showEmptyState(grid);
      }
    }
  });
})();
