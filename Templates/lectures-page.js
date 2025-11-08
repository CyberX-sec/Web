/* global CyberXApi */
(function initLecturesPage() {
  if (typeof window === 'undefined') {
    return;
  }

  function toYouTubeEmbed(url) {
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname.startsWith('/embed/')) {
          return parsed.toString();
        }
        if (parsed.pathname.startsWith('/watch')) {
          const videoId = parsed.searchParams.get('v');
          return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }
        if (parsed.pathname.startsWith('/shorts/')) {
          const videoId = parsed.pathname.split('/')[2];
          return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }
      }

      if (host === 'youtu.be') {
        const videoId = parsed.pathname.slice(1);
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (host === 'youtube-nocookie.com') {
        return parsed.toString();
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function sanitizeForCssUrl(url) {
    if (!url) {
      return '';
    }
    return url.replace(/["'()\\]/g, '\\$&');
  }

  function clearPlaceholders(container) {
    container.querySelectorAll('[data-placeholder]').forEach((node) => node.remove());
  }

  function createBadgeList(items, className) {
    if (!items || !items.length) {
      return null;
    }

    const list = document.createElement('ul');
    list.className = className;
    items.forEach((item) => {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.appendChild(entry);
    });
    return list;
  }

  function createLectureCard(lecture) {
    const card = document.createElement('article');
    card.className = 'lecture-card';

    const embedUrl = toYouTubeEmbed(lecture.videoUrl);
    if (embedUrl) {
      const video = document.createElement('div');
      video.className = 'lecture-video';
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      video.appendChild(iframe);
      card.appendChild(video);
    }

    const body = document.createElement('div');
    body.className = 'lecture-body';

    const title = document.createElement('h4');
    title.textContent = lecture.title || '';
    body.appendChild(title);

    if (lecture.description) {
      const description = document.createElement('p');
      description.textContent = lecture.description;
      body.appendChild(description);
    }

    const actions = document.createElement('div');
    actions.className = 'lecture-actions';

    if (!embedUrl && lecture.videoUrl) {
      const link = document.createElement('a');
      link.href = lecture.videoUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'lecture-link';
      link.textContent = 'مشاهدة الفيديو';
      actions.appendChild(link);
    }

    if (lecture.resourceUrl) {
      const resource = document.createElement('a');
      resource.href = lecture.resourceUrl;
      resource.target = '_blank';
      resource.rel = 'noopener noreferrer';
      resource.className = 'lecture-link';
      resource.textContent = 'المواد المساندة';
      actions.appendChild(resource);
    }

    if (actions.children.length) {
      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function createChannelCard(channel, lectures) {
    const card = document.createElement('section');
    card.className = 'channel-card';
    card.dataset.channelId = String(channel.id);

    const hero = document.createElement('div');
    hero.className = 'channel-hero';
    if (channel.coverImage) {
      const safeCover = sanitizeForCssUrl(channel.coverImage);
      hero.style.backgroundImage = `linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.85)), url("${safeCover}")`;
    }

    const heroContent = document.createElement('div');
    heroContent.className = 'channel-hero-content';

    const title = document.createElement('h3');
    title.textContent = channel.heroTitle || channel.name || 'قناة بدون عنوان';
    heroContent.appendChild(title);

    const subtitleText = channel.heroSubtitle || channel.description;
    if (subtitleText) {
      const subtitle = document.createElement('p');
      subtitle.textContent = subtitleText;
      heroContent.appendChild(subtitle);
    }

    hero.appendChild(heroContent);
    card.appendChild(hero);

    const body = document.createElement('div');
    body.className = 'channel-body';

    const meta = document.createElement('div');
    meta.className = 'channel-meta';

    if (channel.ownerName) {
      const owner = document.createElement('span');
      owner.className = 'channel-owner';
      owner.textContent = `بإشراف: ${channel.ownerName}`;
      meta.appendChild(owner);
    }

    const badgesList = createBadgeList(channel.badges, 'channel-badges');
    if (badgesList) {
      meta.appendChild(badgesList);
    }

    const certificatesList = createBadgeList(channel.certificates, 'channel-certificates');
    if (certificatesList) {
      meta.appendChild(certificatesList);
    }

    if (meta.children.length) {
      body.appendChild(meta);
    }

    const lecturesContainer = document.createElement('div');
    lecturesContainer.className = 'lecture-grid';

    if (lectures.length) {
      lectures.forEach((lecture) => {
        lecturesContainer.appendChild(createLectureCard(lecture));
      });
    } else {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'channel-empty';
      emptyMessage.textContent = 'لم تُنشر محاضرات في هذه القناة بعد.';
      lecturesContainer.appendChild(emptyMessage);
    }

    body.appendChild(lecturesContainer);
    card.appendChild(body);
    return card;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('channels-container');
    const errorElement = document.getElementById('lectures-error');

    if (!container || typeof CyberXApi === 'undefined') {
      return;
    }

    try {
      const channels = await CyberXApi.fetchChannels();
      clearPlaceholders(container);

      if (!channels.length) {
        const empty = document.createElement('p');
        empty.className = 'channel-empty-global';
        empty.textContent = 'لا توجد قنوات منشورة حالياً.';
        container.appendChild(empty);
        return;
      }

      const channelLectures = await Promise.all(
        channels.map(async (channel) => {
          try {
            const lectures = await CyberXApi.fetchLectures({ channelId: channel.id });
            return { channel, lectures };
          } catch (error) {
            return { channel, lectures: [] };
          }
        })
      );

      channelLectures.forEach(({ channel, lectures }) => {
        container.appendChild(createChannelCard(channel, lectures));
      });
    } catch (error) {
      console.error('Failed to load lecture channels', error);
      clearPlaceholders(container);
      if (errorElement) {
        errorElement.textContent = 'تعذر تحميل القنوات. يرجى المحاولة لاحقاً.';
        errorElement.hidden = false;
      }
    }
  });
})();
