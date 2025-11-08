/* global CyberXApi */
(function initAdminPanel() {
  if (typeof window === 'undefined') {
    return;
  }

  function renderLectureList(items) {
    const list = refs.lists.lectures;
    if (!list) {
      return;
    }

    list.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      list.appendChild(createEmptyMessage('لا توجد محاضرات بعد.'));
      return;
    }

    items.forEach((lecture) => {
      const card = document.createElement('div');
      card.className = 'list-item';

      const title = document.createElement('h3');
      title.textContent = lecture.title || '—';
      card.appendChild(title);

      if (lecture.description) {
        const description = document.createElement('p');
        description.textContent = lecture.description.slice(0, 200);
        card.appendChild(description);
      }

      const metaRow = document.createElement('div');
      metaRow.className = 'row';

      const status = document.createElement('span');
      status.className = 'tag';
      status.textContent = lecture.isPublished ? 'منشور' : 'مسودة';
      metaRow.appendChild(status);

      if (lecture.channelName) {
        const channelTag = document.createElement('span');
        channelTag.className = 'tag';
        channelTag.textContent = lecture.channelName;
        metaRow.appendChild(channelTag);
      }

      if (lecture.position) {
        const positionTag = document.createElement('span');
        positionTag.className = 'tag';
        positionTag.textContent = `ترتيب: ${lecture.position}`;
  
        const hasRequiredRole = (requiredRole) => {
          if (!requiredRole) {
            return true;
          }
          if (!state.user || !state.user.role) {
            return false;
          }
          if (requiredRole === 'super-admin') {
            return state.user.role === 'super-admin';
          }
          if (requiredRole === 'admin') {
            return state.user.role === 'admin' || state.user.role === 'super-admin';
          }
          if (requiredRole === 'editor') {
            return ['editor', 'admin', 'super-admin'].includes(state.user.role);
          }
          return false;
        };
      }

      if (lecture.category) {
        const categoryTag = document.createElement('span');
        categoryTag.className = 'tag';
        categoryTag.textContent = lecture.category;
        metaRow.appendChild(categoryTag);
      }

      card.appendChild(metaRow);

      const actions = document.createElement('div');
  actions.className = 'row list-item-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary';
      editButton.textContent = 'تعديل';
      editButton.addEventListener('click', () => {
        fillForm('lectures', lecture);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      actions.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.textContent = 'حذف';
      deleteButton.addEventListener('click', async () => {
        const confirmed = window.confirm('هل أنت متأكد من حذف هذه المحاضرة؟');
        if (!confirmed) {
          return;
        }
        try {
          await CyberXApi.deleteLecture(lecture.id);
          await loadResource('lectures');
          renderLectureList(state.data.lectures);
          updateOverviewHints();
        } catch (error) {
          console.error('Failed to delete lecture', error);
          window.alert('تعذر حذف المحاضرة.');
        }
      });
      actions.appendChild(deleteButton);

      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function renderChannelList(items) {
    const list = refs.lists.channels;
    if (!list) {
      return;
    }

    list.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      list.appendChild(createEmptyMessage('لا توجد قنوات بعد.'));
      return;
    }

    items.forEach((channel) => {
      const card = document.createElement('div');
      card.className = 'list-item';

      const title = document.createElement('h3');
      title.textContent = channel.name || channel.slug || '—';
      card.appendChild(title);

      if (channel.description) {
        const description = document.createElement('p');
        description.textContent = channel.description.slice(0, 220);
        card.appendChild(description);
      }

      const metaRow = document.createElement('div');
      metaRow.className = 'row';

      if (channel.slug) {
        const slugTag = document.createElement('span');
        slugTag.className = 'tag';
        slugTag.textContent = channel.slug;
        metaRow.appendChild(slugTag);
      }

      if (channel.ownerName) {
        const ownerTag = document.createElement('span');
        ownerTag.className = 'tag';
        ownerTag.textContent = `المالك: ${channel.ownerName}`;
        metaRow.appendChild(ownerTag);
      }

      if (channel.heroTitle) {
        const heroTag = document.createElement('span');
        heroTag.className = 'tag';
        heroTag.textContent = channel.heroTitle;
        metaRow.appendChild(heroTag);
      }

      card.appendChild(metaRow);

      const actions = document.createElement('div');
      actions.className = 'row';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary';
      editButton.textContent = 'تعديل';
      editButton.addEventListener('click', () => {
        fillForm('channels', channel);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      actions.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.textContent = 'حذف';
      const canDelete = isSuperAdmin() || String(channel.ownerId) === String(state.user && state.user.id);
      deleteButton.disabled = !canDelete;
      if (!canDelete) {
        deleteButton.title = 'لا تملك صلاحية حذف هذه القناة.';
      }
      deleteButton.addEventListener('click', async () => {
        if (deleteButton.disabled) {
          return;
        }
        const confirmed = window.confirm('هل أنت متأكد من حذف هذه القناة؟');
        if (!confirmed) {
          return;
        }
        try {
          await CyberXApi.deleteChannel(channel.id);
          await loadResource('channels');
          populateChannelSelect();
          renderChannelList(state.data.channels);
          updateOverviewHints();
        } catch (error) {
          console.error('Failed to delete channel', error);
          window.alert('تعذر حذف القناة.');
        }
      });
      actions.appendChild(deleteButton);

      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function renderUserList(items) {
    const list = refs.lists.users;
    if (!list) {
      return;
    }

    list.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      list.appendChild(createEmptyMessage('لا يوجد مستخدمون آخرون بعد.'));
      return;
    }

    items.forEach((user) => {
      const card = document.createElement('div');
      card.className = 'list-item';

      const heading = document.createElement('h3');
      heading.textContent = user.displayName || user.email || '—';
      card.appendChild(heading);

      if (user.email) {
        const emailLine = document.createElement('p');
        emailLine.textContent = user.email;
        card.appendChild(emailLine);
      }

      const metaRow = document.createElement('div');
      metaRow.className = 'row';

      const roleTag = document.createElement('span');
      roleTag.className = 'tag';
      roleTag.textContent = ROLE_LABELS[user.role] || user.role || '—';
      metaRow.appendChild(roleTag);

      if (user.createdAt) {
        const createdTag = document.createElement('span');
        createdTag.className = 'tag';
        createdTag.textContent = `منذ ${new Date(user.createdAt).toLocaleDateString('ar-IQ')}`;
        metaRow.appendChild(createdTag);
      }

      card.appendChild(metaRow);

      const actions = document.createElement('div');
      actions.className = 'row';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary';
      editButton.textContent = 'تعديل';
      editButton.addEventListener('click', () => {
        fillForm('users', user);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      actions.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.textContent = 'حذف';
      deleteButton.disabled = String(user.id) === String(state.user && state.user.id);
      if (deleteButton.disabled) {
        deleteButton.title = 'لا يمكنك حذف حسابك الحالي';
      }
      deleteButton.addEventListener('click', async () => {
        if (deleteButton.disabled) {
          return;
        }
        const confirmed = window.confirm('هل أنت متأكد من حذف هذا المستخدم؟');
        if (!confirmed) {
          return;
        }
        try {
          await CyberXApi.deleteUser(user.id);
          await loadResource('users');
          renderUserList(state.data.users);
          populateOwnerSelect();
        } catch (error) {
          console.error('Failed to delete user', error);
          window.alert('تعذر حذف المستخدم.');
        }
      });
      actions.appendChild(deleteButton);

      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function formatTimestamp(value) {
    if (!value) {
      return '—';
    }
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString('ar-IQ', { hour12: false });
    } catch (error) {
      return value;
    }
  }

  function describeActor(entry) {
    if (!entry) {
      return '—';
    }

    const actor = (entry.details && entry.details.actor) || {};
    const name = entry.userDisplayName || actor.displayName || '';
    const email = entry.userEmail || actor.email || '';
    const roleKey = entry.userRole || actor.role || '';
    const roleLabel = ROLE_LABELS[roleKey] || roleKey;

    const segments = [];
    if (name) {
      segments.push(name);
    } else if (email) {
      segments.push(email);
    } else if (entry.userId) {
      segments.push(`#${entry.userId}`);
    }

    if (roleLabel) {
      segments.push(`(${roleLabel})`);
    }

    if (!segments.length && entry.userId) {
      return `#${entry.userId}`;
    }

    if (!segments.length) {
      return email || '—';
    }

    return segments.join(' ');
  }

  function describeAction(entry) {
    if (!entry) {
      return '—';
    }
    const actionLabel = ACTION_LABELS[entry.action] || entry.action || '';
    const resourceLabel = RESOURCE_LABELS[entry.resource] || entry.resource || '';
    const phrase = `${actionLabel} ${resourceLabel}`.trim();
    return phrase || '—';
  }

  function summarizeActivityDetails(entry) {
    if (!entry || !entry.details) {
      return '—';
    }

    const { summary, fields } = entry.details;
    if (summary) {
      return summary;
    }

    if (Array.isArray(fields) && fields.length) {
      return `الحقول المعدلة: ${fields.join(', ')}`;
    }

    const keys = Object.keys(entry.details).filter((key) => key !== 'actor');
    if (keys.length) {
      return keys.map((key) => `${key}: ${entry.details[key]}`).join(', ');
    }

    return '—';
  }

  function parseTextareaList(value) {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    const stringValue = String(value).trim();
    if (!stringValue) {
      return [];
    }
    if (stringValue.startsWith('[')) {
      try {
        const parsed = JSON.parse(stringValue);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch (error) {
        // Fallback to delimiter parsing below
      }
    }
    return stringValue
      .split(/\r?\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function formatListForTextarea(value) {
    if (!value) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean).join('\n');
    }
    return parseTextareaList(value).join('\n');
  }

  function renderActivityLog(items) {
    const container = refs.lists.activity;
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      container.appendChild(createEmptyMessage('لم يتم تسجيل أنشطة بعد.'));
      return;
    }

    const table = document.createElement('table');
    table.className = 'activity-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>التوقيت</th>
        <th>المستخدم</th>
        <th>الإجراء</th>
        <th>التفاصيل</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    items.forEach((entry) => {
      const row = document.createElement('tr');

  const timeCell = document.createElement('td');
  timeCell.dataset.label = 'التوقيت';
  timeCell.textContent = formatTimestamp(entry.createdAt);
      row.appendChild(timeCell);

      const actorCell = document.createElement('td');
  actorCell.dataset.label = 'المستخدم';
  actorCell.textContent = describeActor(entry);
      row.appendChild(actorCell);

      const actionCell = document.createElement('td');
  actionCell.dataset.label = 'الإجراء';
  actionCell.textContent = describeAction(entry);
      row.appendChild(actionCell);

      const detailCell = document.createElement('td');
  detailCell.dataset.label = 'التفاصيل';
  detailCell.textContent = summarizeActivityDetails(entry);
      row.appendChild(detailCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  async function refreshActivityLog(forceFetch = false) {
    if (!isAdmin()) {
      return;
    }

    if (forceFetch || !Array.isArray(state.data.activity) || !state.data.activity.length) {
      await loadResource('activity');
    }

    renderActivityLog(state.data.activity);
  }

  function createEmptyMessage(message) {
    const empty = document.createElement('p');
    empty.className = 'meta';
    empty.textContent = message;
    return empty;
  }

  function renderTagList(container, items, emptyMessage) {
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      const empty = document.createElement('span');
      empty.className = 'meta';
      empty.textContent = emptyMessage;
      container.appendChild(empty);
      return;
    }

    items.forEach((entry) => {
      const text = String(entry).trim();
      if (!text) {
        return;
      }
      const [label, link] = text.split('|').map((part) => part.trim());
      const tag = document.createElement(link ? 'a' : 'span');
      tag.className = 'tag';
      tag.textContent = label || text;
      if (link) {
        tag.href = link;
        tag.target = '_blank';
        tag.rel = 'noopener noreferrer';
      }
      container.appendChild(tag);
    });
  }

  function homeSectionLabel(key) {
    const entry = HOME_SECTION_LABELS[key];
    if (!entry) {
      return key;
    }
    return `${entry.en} — ${entry.ar}`;
  }

  function parseHomeSectionsOrder(value) {
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
          // ignore malformed JSON
        }
      }
      if (!order.length) {
        order = trimmed.split(',').map((item) => item.trim());
      }
    }

    const allowedKeys = Object.keys(HOME_SECTION_LABELS);
    order = order.filter((key) => allowedKeys.includes(key) && key);

    allowedKeys.forEach((key) => {
      if (!order.includes(key)) {
        order.push(key);
      }
    });

    return order.length ? order : [...DEFAULT_HOME_SECTIONS_ORDER];
  }

  function renderHomeSectionsOrder() {
    if (!refs.homeOrderList) {
      return;
    }

    const template = refs.homeOrderTemplate;
    const order = Array.isArray(state.homeSectionsOrder) && state.homeSectionsOrder.length
      ? [...state.homeSectionsOrder]
      : [...DEFAULT_HOME_SECTIONS_ORDER];

    refs.homeOrderList.innerHTML = '';

    order.forEach((key, index) => {
      if (template && template.content) {
        const fragment = template.content.cloneNode(true);
        const item = fragment.querySelector('[data-section-key]');
        if (!item) {
          return;
        }
        item.dataset.sectionKey = key;

        const label = fragment.querySelector('[data-section-label]');
        if (label) {
          label.textContent = homeSectionLabel(key);
        }

        const buttons = fragment.querySelectorAll('button[data-action]');
        buttons.forEach((button) => {
          const action = button.dataset.action;
          if (action === 'home-section-top') {
            button.disabled = index === 0;
          } else if (action === 'home-section-up') {
            button.disabled = index === 0;
          } else if (action === 'home-section-down') {
            button.disabled = index === order.length - 1;
          }
        });

        refs.homeOrderList.appendChild(fragment);
      } else {
        const fallback = document.createElement('li');
        fallback.dataset.sectionKey = key;
        fallback.textContent = `${index + 1}. ${homeSectionLabel(key)}`;
        refs.homeOrderList.appendChild(fallback);
      }
    });
  }

  function remindSettingsSave(message) {
    const messageElement = refs.formMessages && refs.formMessages.settings;
    if (!messageElement) {
      return;
    }
    setMessage(
      messageElement,
      message || 'تم تعديل إعدادات الصفحة الرئيسية. احفظ التغييرات لتظهر للزوار.',
      false
    );
  }

  function moveHomeSection(sectionKey, action) {
    if (!sectionKey) {
      return;
    }

    const order = Array.isArray(state.homeSectionsOrder)
      ? [...state.homeSectionsOrder]
      : [...DEFAULT_HOME_SECTIONS_ORDER];

    const index = order.findIndex((key) => key === sectionKey);
    if (index === -1) {
      return;
    }

    if (action === 'home-section-up' && index > 0) {
      [order[index - 1], order[index]] = [order[index], order[index - 1]];
    } else if (action === 'home-section-down' && index < order.length - 1) {
      [order[index + 1], order[index]] = [order[index], order[index + 1]];
    } else if (action === 'home-section-top' && index > 0) {
      order.splice(index, 1);
      order.unshift(sectionKey);
    } else {
      return;
    }

    state.homeSectionsOrder = order;
    renderHomeSectionsOrder();
    remindSettingsSave('تم تحديث ترتيب أقسام الصفحة الرئيسية. لا تنس حفظ التغييرات.');
  }

  function resetHomeSectionsOrder() {
    state.homeSectionsOrder = [...DEFAULT_HOME_SECTIONS_ORDER];
    renderHomeSectionsOrder();
    remindSettingsSave('تمت استعادة الترتيب الافتراضي. احفظ التغييرات لتطبيقها.');
  }

  function handleHomeOrderClick(event) {
    if (!refs.homeOrderList) {
      return;
    }

    const button = event.target.closest('button[data-action]');
    if (!button || !refs.homeOrderList.contains(button)) {
      return;
    }

    const { action } = button.dataset;
    const item = button.closest('[data-section-key]');
    if (!action || !item || !item.dataset.sectionKey) {
      return;
    }

    moveHomeSection(item.dataset.sectionKey, action);
  }
  const DEFAULT_AVATAR = '../Team-images/n2.JPEG';
  const DEFAULT_HOME_SECTIONS_ORDER = ['projects', 'lectures', 'articles'];
  const HOME_SECTION_LABELS = {
    projects: { en: 'Projects', ar: 'المشاريع' },
    lectures: { en: 'Lectures', ar: 'المحاضرات' },
    articles: { en: 'Articles', ar: 'المقالات' },
  };

  const state = {
    user: null,
    data: {
      projects: [],
      articles: [],
      lectures: [],
      channels: [],
      users: [],
      settings: {},
      activity: [],
      team: [],
    },
    profile: null,
    activePanel: 'overview',
    teamDirty: false,
    teamLoading: false,
    teamLoaded: false,
    homeSectionsOrder: [...DEFAULT_HOME_SECTIONS_ORDER],
    teamEditor: {
      currentId: null,
    },
  };

  const refs = {};

  function setTeamMessage(message, isSuccess) {
    if (!refs.teamMessage) {
      return;
    }
    setMessage(refs.teamMessage, message, isSuccess);
  }

  function updateTeamControls() {
    const hasItems = Array.isArray(state.data.team) && state.data.team.length > 0;

    if (refs.teamSaveButton) {
      const disabled = state.teamLoading || !state.teamDirty || !hasItems;
      refs.teamSaveButton.disabled = disabled;
    }

    if (refs.teamRefreshButton) {
      refs.teamRefreshButton.disabled = state.teamLoading;
    }
  }

  function markTeamDirty(isDirty) {
    state.teamDirty = Boolean(isDirty);
    updateTeamControls();
  }

  function toggleTeamLoading(isLoading) {
    state.teamLoading = Boolean(isLoading);
    updateTeamControls();
  }

  function renderTeamOrderList(items) {
    const list = refs.teamList;
    if (!list) {
      return;
    }

    list.innerHTML = '';

    const collection = Array.isArray(items) ? items : [];
    if (!collection.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'team-order-placeholder';
      placeholder.textContent = 'لا توجد ملفات مرئية حالياً.';
      list.appendChild(placeholder);
      updateTeamControls();
      return;
    }

    const template = refs.teamTemplate;

    collection.forEach((member, index) => {
      if (template && template.content) {
        const fragment = template.content.cloneNode(true);
        const itemElement = fragment.querySelector('.team-order-item');
        if (!itemElement) {
          return;
        }

        itemElement.dataset.teamId = member.id;

        const avatar = fragment.querySelector('[data-team-avatar]');
        if (avatar) {
          avatar.src = member.avatarUrl || DEFAULT_AVATAR;
          avatar.alt = member.displayName || member.email || `#${member.id}`;
          avatar.addEventListener(
            'error',
            () => {
              avatar.src = DEFAULT_AVATAR;
            },
            { once: true }
          );
        }

        const name = fragment.querySelector('[data-team-name]');
        if (name) {
          name.textContent = `${index + 1}. ${member.displayName || member.email || 'عضو في الفريق'}`;
        }

        const headline = fragment.querySelector('[data-team-headline]');
        if (headline) {
          let text = member.profileHeadline || '';
          if (!text && !member.profileVisible) {
            text = 'غير معروض حالياً';
          } else if (!text) {
            text = member.email || '';
          }
          headline.textContent = text;
          headline.hidden = !text;
        }

        const slug = fragment.querySelector('[data-team-slug]');
        if (slug) {
          const slugText = member.profileSlug ? `/${member.profileSlug}` : '';
          slug.textContent = slugText;
          slug.hidden = !slugText;
        }

        const visibility = fragment.querySelector('[data-team-visible]');
        if (visibility) {
          if (member.profileVisible) {
            visibility.textContent = 'ظاهر';
            visibility.classList.remove('ghost');
          } else {
            visibility.textContent = 'مخفي';
            visibility.classList.add('ghost');
          }
        }

        const buttons = fragment.querySelectorAll('button[data-action]');
        buttons.forEach((button) => {
          const action = button.dataset.action;
          if (action === 'team-up' || action === 'team-top') {
            button.disabled = index === 0;
          }
          if (action === 'team-down') {
            button.disabled = index === collection.length - 1;
          }
          if (!member.profileVisible && (action === 'team-up' || action === 'team-down' || action === 'team-top')) {
            button.disabled = true;
          }
        });

        if (!member.profileVisible) {
          itemElement.classList.add('is-hidden');
        }

        list.appendChild(fragment);
      } else {
        const fallback = document.createElement('li');
        fallback.className = 'team-order-item';
        fallback.dataset.teamId = member.id;
        fallback.textContent = `${index + 1}. ${member.displayName || member.email || 'عضو في الفريق'}`;
        list.appendChild(fallback);
      }
    });

    updateTeamControls();
  }

  async function renderTeamOrderPanel(forceReload = false) {
    if (!isSuperAdmin()) {
      state.data.team = [];
      renderTeamOrderList(state.data.team);
      markTeamDirty(false);
      populateTeamMemberSelect(false);
      renderTeamEditorForm();
      return;
    }

    if (forceReload || (!state.teamLoaded && !state.data.team.length)) {
      try {
        toggleTeamLoading(true);
        setTeamMessage('جاري تحميل بطاقات الفريق...', false);
        const response = await CyberXApi.fetchAdminTeamProfiles();
        state.data.team = Array.isArray(response) ? response : [];
        state.teamLoaded = true;
        markTeamDirty(false);
        setTeamMessage('', false);
      } catch (error) {
        console.error('Failed to load team profiles', error);
        setTeamMessage(error.message || 'تعذر تحميل ملفات الفريق.', false);
      } finally {
        toggleTeamLoading(false);
      }
    }

    renderTeamOrderList(state.data.team);
    populateTeamMemberSelect(true);
    renderTeamEditorForm();
  }

  function findTeamMember(memberId) {
    const members = Array.isArray(state.data.team) ? state.data.team : [];
    return members.find((member) => String(member.id) === String(memberId)) || null;
  }

  function populateTeamMemberSelect(preserveCurrent = true) {
    const select = refs.teamMemberSelect;
    if (!select) {
      return;
    }

    const members = Array.isArray(state.data.team) ? state.data.team : [];
    const previous = preserveCurrent ? state.teamEditor.currentId : null;

    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— اختر عضو الفريق —';
    select.appendChild(placeholder);

    members.forEach((member) => {
      const option = document.createElement('option');
      option.value = member.id;
      option.textContent = member.displayName || member.email || `#${member.id}`;
      select.appendChild(option);
    });

    if (previous && members.some((member) => String(member.id) === String(previous))) {
      select.value = String(previous);
      state.teamEditor.currentId = String(previous);
    } else {
      select.value = '';
      state.teamEditor.currentId = null;
    }
  }

  function renderTeamEditorForm() {
    const form = refs.forms.teamProfile;
    if (!form || !form.elements) {
      return;
    }

    const currentId = state.teamEditor.currentId;
    const member = currentId ? findTeamMember(currentId) : null;

    if (member) {
      if (refs.teamMemberSelect) {
        refs.teamMemberSelect.value = String(member.id);
      }
      if (form.elements.id) {
        form.elements.id.value = member.id || '';
      }
      if (form.elements.memberId) {
        form.elements.memberId.value = member.id || '';
      }
      if (form.elements.displayName) {
        form.elements.displayName.value = member.displayName || member.email || '';
      }
      if (form.elements.profileSlug) {
        form.elements.profileSlug.value = member.profileSlug || '';
      }
      if (form.elements.profileHeadline) {
        form.elements.profileHeadline.value = member.profileHeadline || '';
      }
      if (form.elements.avatarUrl) {
        form.elements.avatarUrl.value = member.avatarUrl || '';
      }
      if (form.elements.profileHeroImage) {
        form.elements.profileHeroImage.value = member.profileHeroImage || '';
      }
      if (form.elements.bio) {
        form.elements.bio.value = member.bio || '';
      }
      if (form.elements.badges) {
        form.elements.badges.value = Array.isArray(member.badges) ? member.badges.join('\n') : '';
      }
      if (form.elements.certificates) {
        form.elements.certificates.value = Array.isArray(member.certificates)
          ? member.certificates.join('\n')
          : '';
      }
      if (form.elements.profileContactLinks) {
        form.elements.profileContactLinks.value = Array.isArray(member.profileContactLinks)
          ? member.profileContactLinks.join('\n')
          : '';
      }
      if (form.elements.profileVisible) {
        form.elements.profileVisible.checked = Boolean(member.profileVisible);
      }
      if (form.elements.profilePosition) {
        form.elements.profilePosition.value = member.profilePosition === null || member.profilePosition === undefined
          ? ''
          : member.profilePosition;
      }
    } else {
      form.reset();
      if (refs.teamMemberSelect) {
        refs.teamMemberSelect.value = '';
      }
      if (form.elements.id) {
        form.elements.id.value = '';
      }
      if (form.elements.memberId) {
        form.elements.memberId.value = '';
      }
    }
  }

  function setTeamEditorMember(memberId) {
    if (!memberId) {
      state.teamEditor.currentId = null;
    } else {
      const member = findTeamMember(memberId);
      state.teamEditor.currentId = member ? String(member.id) : null;
    }
    renderTeamEditorForm();
  }

  async function handleDeleteTeamMember(memberId) {
    if (!isSuperAdmin() || !memberId) {
      return;
    }

    const confirmed = window.confirm('هل أنت متأكد من حذف هذا العضو من الفريق؟ لا يمكن التراجع عن هذه العملية.');
    if (!confirmed) {
      return;
    }

    try {
      toggleTeamLoading(true);
      await CyberXApi.deleteTeamProfile(memberId);
      setTeamMessage('تم حذف العضو من الفريق.', true);
      if (String(state.teamEditor.currentId) === String(memberId)) {
        state.teamEditor.currentId = null;
      }
      state.teamLoaded = false;
      await renderTeamOrderPanel(true);
      const teamFormMessage = refs.formMessages && refs.formMessages.teamProfile;
      clearMessage(teamFormMessage);
    } catch (error) {
      console.error('Failed to delete team profile', error);
      setTeamMessage(error.message || 'تعذر حذف العضو.', false);
    } finally {
      toggleTeamLoading(false);
      renderTeamEditorForm();
    }
  }

  function moveTeamMember(memberId, action) {
    if (state.teamLoading) {
      return;
    }

    const members = Array.isArray(state.data.team) ? [...state.data.team] : [];
    const index = members.findIndex((member) => String(member.id) === String(memberId));
    if (index === -1) {
      return;
    }

    if (action === 'team-up' && index === 0) {
      return;
    }
    if (action === 'team-down' && index === members.length - 1) {
      return;
    }

    const member = members[index];

    if (action === 'team-top') {
      members.splice(index, 1);
      members.unshift(member);
    } else if (action === 'team-up') {
      [members[index - 1], members[index]] = [members[index], members[index - 1]];
    } else if (action === 'team-down') {
      [members[index + 1], members[index]] = [members[index], members[index + 1]];
    } else {
      return;
    }

    state.data.team = members;
    markTeamDirty(true);
    renderTeamOrderList(state.data.team);
  }

  function handleTeamListClick(event) {
    if (!refs.teamList) {
      return;
    }

    const button = event.target.closest('button[data-action]');
    if (!button || !refs.teamList.contains(button)) {
      return;
    }

    if (button.disabled) {
      return;
    }

    const { action } = button.dataset;
    if (!action || !action.startsWith('team-')) {
      return;
    }

    const item = button.closest('.team-order-item');
    if (!item || !item.dataset.teamId) {
      return;
    }

    const memberId = item.dataset.teamId;

    if (action === 'team-edit') {
      setTeamEditorMember(memberId);
      if (refs.forms && refs.forms.teamProfile) {
        refs.forms.teamProfile.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (action === 'team-delete') {
      handleDeleteTeamMember(memberId).catch((error) => {
        console.error('Failed to delete team member', error);
      });
      return;
    }

    moveTeamMember(memberId, action);
  }

  async function saveTeamOrder() {
    if (!isSuperAdmin() || state.teamLoading) {
      return;
    }

    if (!state.teamDirty) {
      setTeamMessage('لا توجد تغييرات للحفظ.', false);
      return;
    }

    const order = Array.isArray(state.data.team) ? state.data.team.map((member) => member.id) : [];

    try {
      toggleTeamLoading(true);
      setTeamMessage('جاري حفظ الترتيب...', false);
      const updated = await CyberXApi.updateTeamOrder({ order });
      if (Array.isArray(updated)) {
        state.data.team = updated;
        populateTeamMemberSelect(true);
        renderTeamEditorForm();
      }
      markTeamDirty(false);
      setTeamMessage('تم حفظ ترتيب الفريق.', true);
    } catch (error) {
      console.error('Failed to save team order', error);
      setTeamMessage(error.message || 'تعذر حفظ الترتيب.', false);
    } finally {
      toggleTeamLoading(false);
      renderTeamOrderList(state.data.team);
    }
  }

  async function refreshTeamOrder() {
    if (!isSuperAdmin() || state.teamLoading) {
      return;
    }
    state.teamLoaded = false;
    markTeamDirty(false);
    await renderTeamOrderPanel(true);
  }
  const ROLE_LABELS = {
    'super-admin': 'مشرف أعلى',
    admin: 'مشرف',
    editor: 'محرر',
  };
  const ROLE_PRIVILEGES = {
    'super-admin': 'يمكنك إدارة كل شيء بما في ذلك المستخدمين والإعدادات.',
    admin: 'يمكنك إنشاء القنوات ونشر المحاضرات والمقالات والمشاريع.',
    editor: 'يمكنك نشر المقالات والمشاريع فقط.',
  };
  const ACTION_LABELS = {
    create: 'إنشاء',
    update: 'تحديث',
    delete: 'حذف',
  };
  const RESOURCE_LABELS = {
    user: 'مستخدم',
    channel: 'قناة',
    lecture: 'محاضرة',
    article: 'مقال',
    project: 'مشروع',
    site_settings: 'إعدادات الموقع',
    team: 'الفريق',
  };

  const isSuperAdmin = () => state.user && state.user.role === 'super-admin';
  const isAdmin = () => state.user && (state.user.role === 'admin' || state.user.role === 'super-admin');

  const hasRequiredRole = (requiredRole) => {
    if (!requiredRole) {
      return true;
    }
    if (!state.user || !state.user.role) {
      return false;
    }
    if (requiredRole === 'super-admin') {
      return state.user.role === 'super-admin';
    }
    if (requiredRole === 'admin') {
      return state.user.role === 'admin' || state.user.role === 'super-admin';
    }
    if (requiredRole === 'editor') {
      return ['editor', 'admin', 'super-admin'].includes(state.user.role);
    }
    return false;
  };

  function initializeUploadField(container, options = {}) {
    if (!container) {
      return;
    }

    const input =
      container.querySelector('[data-upload-input]') ||
      container.querySelector('input[name], textarea[name]');
    const fileInput = container.querySelector('[data-file-control]');
    const selectButton = container.querySelector('[data-action="select-file"]');
    const clearButton = container.querySelector('[data-action="clear-file"]');
    const messageElement = options.messageElement;
    const folder = options.folder || container.dataset.uploadFolder || 'general';
    const successMessage = options.successMessage || container.dataset.uploadSuccess || 'تم رفع الصورة بنجاح.';
    const pendingMessage = options.pendingMessage || container.dataset.uploadPending || 'جاري رفع الصورة...';
    const appendTargetSelector = container.dataset.uploadAppendTarget;
    const appendScope = container.closest('form') || document;

    if (!input) {
      return;
    }

    const handleUpload = async (file) => {
      if (!file) {
        return;
      }
      try {
        setMessage(messageElement, pendingMessage, false);
        const result = await CyberXApi.uploadMedia(file, { folder });
        if (result && result.url) {
          input.value = result.url;
          if (appendTargetSelector) {
            const targets = Array.from(appendScope.querySelectorAll(appendTargetSelector));
            targets.forEach((target) => {
              if (!target || typeof target.value !== 'string') {
                return;
              }
              const entries = parseTextareaList(target.value);
              if (!entries.includes(result.url)) {
                entries.push(result.url);
              }
              target.value = entries.join('\n');
            });
          }
          setMessage(messageElement, successMessage, true);
        }
      } catch (error) {
        console.error('Failed to upload image', error);
        setMessage(messageElement, error.message || 'تعذر رفع الصورة.');
      } finally {
        if (fileInput) {
          fileInput.value = '';
        }
      }
    };

    if (selectButton && fileInput) {
      selectButton.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', () => {
        const [file] = fileInput.files || [];
        if (file) {
          handleUpload(file);
        }
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        input.value = '';
        clearMessage(messageElement);
      });
    }
  }

  function setupUploadFields() {
    Object.entries(refs.forms || {}).forEach(([formKey, form]) => {
      if (!form) {
        return;
      }

      const messageElement = refs.formMessages ? refs.formMessages[formKey] : null;

      form.querySelectorAll('[data-upload-field]').forEach((container) => {
        initializeUploadField(container, {
          folder: container.dataset.uploadFolder || 'general',
          messageElement,
          successMessage: container.dataset.uploadSuccess,
          pendingMessage: container.dataset.uploadPending,
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    refs.loader = document.getElementById('loader');
  refs.appShell = document.getElementById('page-content');
    refs.loginView = document.getElementById('login-view');
    refs.dashboardView = document.getElementById('dashboard-view');
    refs.loginForm = document.getElementById('login-form');
    refs.loginMessage = document.getElementById('login-message');
    refs.currentUser = document.getElementById('current-user');
    refs.logoutButton = document.getElementById('logout-button');
    refs.tabs = Array.from(document.querySelectorAll('.tab'));
    refs.panels = Array.from(document.querySelectorAll('.panel'));

    refs.profileChip = document.querySelector('[data-profile-chip]');
    refs.profileName = document.querySelector('[data-profile-name]');
    refs.profileRole = document.querySelector('[data-profile-role]');
  refs.profileAvatar = document.querySelector('[data-profile-avatar]');
    refs.profileDisplay = document.querySelector('[data-profile-display]');
    refs.profileBio = document.querySelector('[data-profile-bio]');
    refs.tagContainers = {
      badges: document.querySelector('[data-profile-badges]'),
      certificates: document.querySelector('[data-profile-certificates]'),
    };
    refs.overviewHints = document.querySelector('.overview-hints');
    refs.channelOwnerField = document.querySelector('[data-owner-field]');

    refs.forms = {
      profile: document.querySelector('[data-form="profile"]'),
      channels: document.querySelector('[data-form="channels"]'),
      projects: document.querySelector('[data-form="projects"]'),
      articles: document.querySelector('[data-form="articles"]'),
      lectures: document.querySelector('[data-form="lectures"]'),
      users: document.querySelector('[data-form="users"]'),
      settings: document.querySelector('[data-form="settings"]'),
      teamProfile: document.querySelector('[data-form="team-profile"]'),
      activity: null,
    };

    refs.formMessages = {
      profile: document.querySelector('[data-message="profile"]'),
      channels: document.querySelector('[data-message="channels"]'),
      projects: document.querySelector('[data-message="projects"]'),
      articles: document.querySelector('[data-message="articles"]'),
      lectures: document.querySelector('[data-message="lectures"]'),
      users: document.querySelector('[data-message="users"]'),
      settings: document.querySelector('[data-message="settings"]'),
      team: document.querySelector('[data-message="team"]'),
      teamProfile: document.querySelector('[data-message="team-profile"]'),
      activity: null,
    };

    refs.lists = {
      channels: document.querySelector('[data-list="channels"]'),
      projects: document.querySelector('[data-list="projects"]'),
      articles: document.querySelector('[data-list="articles"]'),
      lectures: document.querySelector('[data-list="lectures"]'),
      users: document.querySelector('[data-list="users"]'),
      activity: document.querySelector('[data-list="activity"]'),
    };

  refs.homeOrderTemplate = document.getElementById('home-section-item-template');
  refs.homeOrderList = document.querySelector('[data-home-order-list]');
  refs.homeOrderResetButton = document.querySelector('[data-action="home-order-reset"]');
  refs.teamTemplate = document.getElementById('team-order-item-template');
    refs.teamList = document.querySelector('[data-team-list]');
    refs.teamSaveButton = document.querySelector('[data-action="team-save"]');
    refs.teamRefreshButton = document.querySelector('[data-action="team-refresh"]');
    refs.teamMessage = refs.formMessages.team;
  refs.teamMemberSelect = document.querySelector('[data-team-member-select]');

    refs.activityRefreshButton = document.querySelector('[data-action="refresh-activity"]');

      renderHomeSectionsOrder();
    bindEvents();
    bootstrapSession();
  });

  function bindEvents() {
    if (refs.loginForm) {
      refs.loginForm.addEventListener('submit', handleLoginSubmit);
    }

    if (refs.logoutButton) {
      refs.logoutButton.addEventListener('click', handleLogout);
    }

    refs.tabs.forEach((tab) => {
      tab.addEventListener('click', () => activatePanel(tab.dataset.target));
    });

    Object.entries(refs.forms).forEach(([key, form]) => {
      if (!form) {
        return;
      }
      form.addEventListener('submit', (event) => handleResourceSubmit(event, key));
      const resetButton = form.querySelector('[data-action="reset"]');
      if (resetButton) {
        resetButton.addEventListener('click', (event) => {
          event.preventDefault();
          resetForm(key);
        });
      }
    });

    if (refs.homeOrderList) {
      refs.homeOrderList.addEventListener('click', handleHomeOrderClick);
    }

    if (refs.homeOrderResetButton) {
      refs.homeOrderResetButton.addEventListener('click', (event) => {
        event.preventDefault();
        resetHomeSectionsOrder();
      });
    }

    if (refs.teamMemberSelect) {
      refs.teamMemberSelect.addEventListener('change', (event) => {
        setTeamEditorMember(event.target.value);
      });
    }

    const channelForm = refs.forms.channels;
    if (channelForm && channelForm.elements.name && channelForm.elements.slug) {
      channelForm.elements.name.addEventListener('input', () => {
        if (!channelForm.elements.id.value) {
          channelForm.elements.slug.value = slugify(channelForm.elements.name.value);
        }
      });
    }

    const profileForm = refs.forms.profile;
    if (profileForm && profileForm.elements.displayName && profileForm.elements.profileSlug) {
      profileForm.elements.displayName.addEventListener('input', () => {
        if (!profileForm.elements.profileSlug.value) {
          const base = slugify(profileForm.elements.displayName.value);
          const asciiSlug = base
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          profileForm.elements.profileSlug.value = asciiSlug;
        }
      });

      profileForm.elements.profileSlug.addEventListener('input', () => {
        const value = profileForm.elements.profileSlug.value || '';
        const sanitized = value
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        if (sanitized !== value) {
          profileForm.elements.profileSlug.value = sanitized;
        }
      });
    }

    const teamProfileForm = refs.forms.teamProfile;
    if (teamProfileForm && teamProfileForm.elements.displayName && teamProfileForm.elements.profileSlug) {
      teamProfileForm.elements.displayName.addEventListener('input', () => {
        if (!teamProfileForm.elements.profileSlug.value) {
          const base = slugify(teamProfileForm.elements.displayName.value);
          const asciiSlug = base
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          teamProfileForm.elements.profileSlug.value = asciiSlug;
        }
      });

      teamProfileForm.elements.profileSlug.addEventListener('input', () => {
        const value = teamProfileForm.elements.profileSlug.value || '';
        const sanitized = value
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        if (sanitized !== value) {
          teamProfileForm.elements.profileSlug.value = sanitized;
        }
      });
    }

    setupUploadFields();

    if (refs.activityRefreshButton) {
      refs.activityRefreshButton.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!isAdmin()) {
          return;
        }
        const button = refs.activityRefreshButton;
        if (button) {
          button.disabled = true;
        }
        try {
          await refreshActivityLog(true);
        } finally {
          if (button) {
            window.setTimeout(() => {
              button.disabled = false;
            }, 150);
          }
        }
      });
    }

    if (refs.teamList) {
      refs.teamList.addEventListener('click', handleTeamListClick);
    }

    if (refs.teamSaveButton) {
      refs.teamSaveButton.addEventListener('click', (event) => {
        event.preventDefault();
        saveTeamOrder().catch((error) => {
          console.error('Failed to save team order', error);
        });
      });
    }

    if (refs.teamRefreshButton) {
      refs.teamRefreshButton.addEventListener('click', (event) => {
        event.preventDefault();
        refreshTeamOrder().catch((error) => {
          console.error('Failed to refresh team order', error);
        });
      });
    }
  }

  async function bootstrapSession() {
    if (typeof CyberXApi === 'undefined') {
      return;
    }

    setLoaderVisible(true);

    try {
      const user = await CyberXApi.fetchCurrentUser();
      state.user = user;
      showDashboard();
      await loadAllData();
    } catch (error) {
      console.info('No active session found:', error && error.message);
      showLogin();
    } finally {
      setLoaderVisible(false);
    }
  }

  function setLoaderVisible(visible) {
    if (!refs.loader) {
      return;
    }

    if (visible) {
      refs.loader.style.display = 'flex';
      requestAnimationFrame(() => {
        refs.loader.style.opacity = '1';
        refs.loader.style.pointerEvents = 'auto';
      });
    } else {
      refs.loader.style.opacity = '0';
      refs.loader.style.pointerEvents = 'none';
      window.setTimeout(() => {
        if (refs.loader) {
          refs.loader.style.display = 'none';
        }
      }, 800);
    }
  }

  function setAppVisible(visible) {
    if (!refs.appShell) {
      return;
    }
    refs.appShell.style.display = visible ? '' : 'none';
  }

  function showLogin() {
    setAppVisible(true);
    if (refs.loginView) {
      refs.loginView.hidden = false;
    }
    if (refs.dashboardView) {
      refs.dashboardView.hidden = true;
    }
    if (refs.logoutButton) {
      refs.logoutButton.hidden = true;
    }
  }

  function showDashboard() {
    setAppVisible(true);
    if (refs.loginView) {
      refs.loginView.hidden = true;
    }
    if (refs.dashboardView) {
      refs.dashboardView.hidden = false;
    }
    if (refs.logoutButton) {
      refs.logoutButton.hidden = false;
    }

    refreshProfileDisplays();
    applyRoleVisibility();
    activatePanel(state.activePanel);
  }

  function applyRoleVisibility() {
    const superAdmin = isSuperAdmin();
    let activePanelAllowed = true;

    refs.tabs.forEach((tab) => {
      const requiredRole = tab.dataset.roleRequired;
      const allowed = hasRequiredRole(requiredRole);
      tab.style.display = allowed ? '' : 'none';
      if (!allowed && state.activePanel === tab.dataset.target) {
        activePanelAllowed = false;
      }
    });

    refs.panels.forEach((panel) => {
      const requiredRole = panel.dataset.roleRequired;
      const allowed = hasRequiredRole(requiredRole);
      if (!allowed) {
        panel.hidden = true;
        panel.classList.remove('active');
      }
    });

    if (!activePanelAllowed) {
      state.activePanel = 'overview';
    }
    if (refs.channelOwnerField) {
      refs.channelOwnerField.classList.toggle('visible', superAdmin);
      const ownerSelect = refs.forms.channels && refs.forms.channels.elements && refs.forms.channels.elements.ownerId;
      if (ownerSelect) {
        ownerSelect.disabled = !superAdmin;
        if (!superAdmin) {
          ownerSelect.value = '';
        }
      }
    }
    const activePanelElement = refs.panels.find((panel) => panel.dataset.panel === state.activePanel);
    if (!activePanelElement || !hasRequiredRole(activePanelElement.dataset.roleRequired)) {
      state.activePanel = 'overview';
    }
  }

  function refreshProfileDisplays() {
    const profile = state.profile || state.user || {};
    const displayName = profile.displayName || profile.email || 'Cyber X';
    const roleLabel = state.user ? ROLE_LABELS[state.user.role] || state.user.role || '' : '';

    if (refs.profileName) {
      refs.profileName.textContent = displayName;
    }

    if (refs.profileRole) {
      refs.profileRole.textContent = roleLabel ? `دورك: ${roleLabel}` : '';
    }

    if (refs.profileAvatar) {
      refs.profileAvatar.src = profile.avatarUrl || DEFAULT_AVATAR;
    }

    if (refs.profileDisplay) {
      refs.profileDisplay.textContent = displayName;
    }

    if (refs.profileBio) {
      refs.profileBio.textContent = profile.bio || 'يمكنك إضافة نبذة تعريفية من تبويب "الملف الشخصي".';
    }

    renderTagList(refs.tagContainers && refs.tagContainers.badges, profile.badges, 'لم يتم إضافة شارات بعد.');
    renderTagList(refs.tagContainers && refs.tagContainers.certificates, profile.certificates, 'لا توجد شهادات مضافة.');

    if (refs.currentUser && state.user) {
      const chipText = `${displayName} — ${roleLabel}`.trim().replace(/\s+—\s*$/, '');
      refs.currentUser.textContent = chipText;
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    clearMessage(refs.loginMessage);

    if (!refs.loginForm) {
      return;
    }

    const formData = new FormData(refs.loginForm);
    const payload = {
      email: (formData.get('email') || '').trim(),
      password: formData.get('password'),
    };

    if (!payload.email || !payload.password) {
      setMessage(refs.loginMessage, 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoaderVisible(true);

    try {
      const user = await CyberXApi.login(payload);
      state.user = user;
      refs.loginForm.reset();
      showDashboard();
      await loadAllData();
    } catch (error) {
      setMessage(refs.loginMessage, error.message || 'فشل تسجيل الدخول.');
    } finally {
      setLoaderVisible(false);
    }
  }

  async function handleLogout() {
    setLoaderVisible(true);
    try {
      await CyberXApi.logout();
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      resetState();
      showLogin();
      setLoaderVisible(false);
    }
  }

  function resetState() {
    state.user = null;
    state.profile = null;
    state.activePanel = 'overview';
    state.data = {
      projects: [],
      articles: [],
      lectures: [],
      channels: [],
      users: [],
      settings: {},
      activity: [],
      team: [],
    };
    state.teamDirty = false;
    state.teamLoading = false;
    state.teamLoaded = false;
    state.homeSectionsOrder = [...DEFAULT_HOME_SECTIONS_ORDER];
    state.teamEditor.currentId = null;

    if (refs.profileName) {
      refs.profileName.textContent = 'Cyber X';
    }

    if (refs.profileRole) {
      refs.profileRole.textContent = '';
    }

    if (refs.profileAvatar) {
      refs.profileAvatar.src = DEFAULT_AVATAR;
    }

    if (refs.profileDisplay) {
      refs.profileDisplay.textContent = 'Cyber X';
    }

    if (refs.profileBio) {
      refs.profileBio.textContent = 'ابدأ باختيار أحد الأقسام من القائمة لإضافة أو تعديل المحتوى.';
    }

    renderTagList(refs.tagContainers && refs.tagContainers.badges, [], 'لم يتم إضافة شارات بعد.');
    renderTagList(refs.tagContainers && refs.tagContainers.certificates, [], 'لا توجد شهادات مضافة.');

    if (refs.currentUser) {
      refs.currentUser.textContent = '';
    }

    Object.values(refs.lists || {}).forEach((list) => {
      if (list) {
        list.innerHTML = '';
      }
    });

    Object.keys(refs.forms || {}).forEach((key) => {
      resetForm(key);
    });

    populateChannelSelect();
    populateOwnerSelect();
    updateOverviewHints();
  }

  function activatePanel(panelName) {
    if (!panelName) {
      return;
    }

    const panelElement = refs.panels.find((panel) => panel.dataset.panel === panelName);
    const requiredRole = panelElement ? panelElement.dataset.roleRequired : null;
    if (!panelElement || !hasRequiredRole(requiredRole)) {
      panelName = 'overview';
    }
    state.activePanel = panelName;
    refs.tabs.forEach((tab) => {
      const isActive = tab.dataset.target === panelName;
      tab.classList.toggle('active', isActive);
    });

    refs.panels.forEach((panel) => {
      const matches = panel.dataset.panel === panelName;
      panel.hidden = !matches;
      panel.classList.toggle('active', matches);
    });

    refreshPanel(panelName);
  }

  function refreshPanel(panelName) {
    const target = panelName || state.activePanel;
    if (target === 'overview') {
      refreshProfileDisplays();
      updateOverviewHints();
      return;
    }

    if (target === 'profile') {
      renderProfileForm();
      return;
    }

    if (target === 'channels') {
      renderChannelList(state.data.channels);
      return;
    }

    if (target === 'lectures') {
      renderLectureList(state.data.lectures);
      return;
    }

    if (target === 'users') {
      renderUserList(state.data.users);
      return;
    }

    if (target === 'settings') {
      renderSettingsForm();
      return;
    }

    if (target === 'activity') {
      refreshActivityLog().catch((error) => {
        console.error('Failed to refresh activity log', error);
      });
      return;
    }

    if (target === 'team') {
      renderTeamOrderPanel().catch((error) => {
        console.error('Failed to render team ordering panel', error);
        setTeamMessage(error.message || 'تعذر تحميل بطاقات الفريق.', false);
      });
      return;
    }

    if (state.data[target]) {
      renderList(target, state.data[target]);
    }
  }

  async function loadAllData() {
    const tasks = [
      loadProfile(),
      loadResource('channels'),
      loadResource('projects'),
      loadResource('articles'),
      loadResource('lectures'),
    ];

    state.data.activity = [];

    if (isSuperAdmin()) {
      tasks.push(loadResource('users'));
      tasks.push(loadSettings());
      tasks.push(loadResource('activity'));
      tasks.push(loadResource('team'));
    } else {
      state.data.users = [];
      state.data.settings = {};
      state.data.team = [];
      state.teamLoaded = false;
      markTeamDirty(false);

      if (isAdmin()) {
        tasks.push(loadResource('activity'));
      }
    }

    await Promise.all(tasks);
    populateChannelSelect();
    populateOwnerSelect();
    refreshPanel();
  }

  async function loadResource(resource) {
    if (!resource) {
      return;
    }

    try {
      let items = [];
      if (resource === 'projects') {
        items = await CyberXApi.fetchProjects({ includeDrafts: 'true' });
      } else if (resource === 'articles') {
        items = await CyberXApi.fetchArticles({ includeDrafts: 'true' });
      } else if (resource === 'lectures') {
        items = await CyberXApi.fetchAdminLectures();
      } else if (resource === 'channels') {
        items = await CyberXApi.fetchAdminChannels();
      } else if (resource === 'users' && isSuperAdmin()) {
        items = await CyberXApi.fetchUsers();
      } else if (resource === 'activity' && isAdmin()) {
        items = await CyberXApi.fetchActivityLog({ limit: 200 });
      } else if (resource === 'team' && isSuperAdmin()) {
        items = await CyberXApi.fetchAdminTeamProfiles();
        state.teamLoaded = true;
        markTeamDirty(false);
      }

      if (Array.isArray(items)) {
        state.data[resource] = items;
      }
    } catch (error) {
      console.error(`Failed to load ${resource}`, error);
    }
  }

  async function loadSettings() {
    if (!isSuperAdmin()) {
      state.data.settings = {};
      return;
    }

    try {
      const settings = await CyberXApi.fetchAdminSiteSettings();
      state.data.settings = settings || {};
      renderSettingsForm();
    } catch (error) {
      console.error('Failed to load site settings', error);
    }
  }

  async function loadProfile() {
    try {
      const profile = await CyberXApi.fetchProfile();
      state.profile = profile;
      if (state.user) {
        state.user.displayName = profile.displayName || state.user.displayName;
        state.user.avatarUrl = profile.avatarUrl || state.user.avatarUrl;
        state.user.bio = profile.bio || state.user.bio;
        state.user.badges = profile.badges || state.user.badges;
        state.user.certificates = profile.certificates || state.user.certificates;
        state.user.profileSlug = profile.profileSlug;
        state.user.profileHeadline = profile.profileHeadline;
        state.user.profileVisible = profile.profileVisible;
        state.user.profileHeroImage = profile.profileHeroImage;
        state.user.profileContactLinks = profile.profileContactLinks;
      }
      refreshProfileDisplays();
      renderProfileForm();
    } catch (error) {
      console.error('Failed to load profile', error);
    }
  }

  function populateChannelSelect() {
    const form = refs.forms.lectures;
    if (!form || !form.elements || !form.elements.channelId) {
      return;
    }

    const select = form.elements.channelId;
    const previous = select.value;
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— اختر القناة —';
    select.appendChild(placeholder);

    state.data.channels.forEach((channel) => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = channel.name || channel.slug;
      select.appendChild(option);
    });

    if (previous && state.data.channels.some((channel) => String(channel.id) === String(previous))) {
      select.value = previous;
    }
  }

  function populateOwnerSelect() {
    if (!isSuperAdmin()) {
      return;
    }

    const form = refs.forms.channels;
    if (!form || !form.elements || !form.elements.ownerId) {
      return;
    }

    const select = form.elements.ownerId;
    const previous = select.value;
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— اختر المالك —';
    select.appendChild(placeholder);

    state.data.users.forEach((user) => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.displayName || user.email;
      select.appendChild(option);
    });

    if (previous && state.data.users.some((user) => String(user.id) === String(previous))) {
      select.value = previous;
    }
  }

  function renderProfileForm() {
    const form = refs.forms.profile;
    if (!form || !form.elements) {
      return;
    }

    const profile = state.profile || state.user || {};
    form.elements.displayName.value = profile.displayName || '';
    if (form.elements.avatarUrl) {
      form.elements.avatarUrl.value = profile.avatarUrl || '';
    }
    if (form.elements.profileSlug) {
      form.elements.profileSlug.value = profile.profileSlug || '';
    }
    if (form.elements.profileHeadline) {
      form.elements.profileHeadline.value = profile.profileHeadline || '';
    }
    if (form.elements.bio) {
      form.elements.bio.value = profile.bio || '';
    }
    if (form.elements.badges) {
      form.elements.badges.value = Array.isArray(profile.badges) ? profile.badges.join('\n') : '';
    }
    if (form.elements.certificates) {
      form.elements.certificates.value = Array.isArray(profile.certificates)
        ? profile.certificates.join('\n')
        : '';
    }
    if (form.elements.profileHeroImage) {
      form.elements.profileHeroImage.value = profile.profileHeroImage || '';
    }
    if (form.elements.profileContactLinks) {
      form.elements.profileContactLinks.value = Array.isArray(profile.profileContactLinks)
        ? profile.profileContactLinks.join('\n')
        : '';
    }
    if (form.elements.profileVisible) {
      form.elements.profileVisible.checked = Boolean(profile.profileVisible);
    }
  }

  function updateOverviewHints() {
    if (!refs.overviewHints) {
      return;
    }

    const projects = state.data.projects || [];
    const articles = state.data.articles || [];
    const lectures = state.data.lectures || [];
    const channels = state.data.channels || [];

    const publishedProjects = projects.filter((item) => item.isPublished).length;
    const publishedArticles = articles.filter((item) => item.isPublished).length;
    const publishedLectures = lectures.filter((item) => item.isPublished).length;

    const lines = [
      `لديك ${publishedProjects} مشروع منشور من أصل ${projects.length}.`,
      `المقالات المنشورة: ${publishedArticles} من أصل ${articles.length}.`,
      `المحاضرات الجاهزة للنشر: ${publishedLectures} من أصل ${lectures.length}.`,
      `عدد القنوات المرتبطة بك: ${channels.length}.`,
    ];

    const currentRole = state.user && state.user.role;
    if (currentRole && ROLE_PRIVILEGES[currentRole]) {
      const roleLabel = ROLE_LABELS[currentRole] || currentRole;
      lines.push(`دورك الحالي: ${roleLabel} — ${ROLE_PRIVILEGES[currentRole]}`);
    }

    refs.overviewHints.innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
  }

  function renderSettingsForm() {
    const form = refs.forms.settings;
    if (!form) {
      return;
    }

    const settings = state.data.settings || {};
    const getSetting = (key) => {
      if (!settings || typeof settings !== 'object') {
        return '';
      }
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        return settings[key] || '';
      }
      return '';
    };

    if (form.elements.homeHeroTitle) {
      form.elements.homeHeroTitle.value = getSetting('home.heroTitle');
    }
    if (form.elements.homeHeroLineAr) {
      form.elements.homeHeroLineAr.value = getSetting('home.heroLineAr');
    }
    if (form.elements.homeHeroLineEn) {
      form.elements.homeHeroLineEn.value = getSetting('home.heroLineEn');
    }
    if (form.elements.homeHeroImage) {
      form.elements.homeHeroImage.value = getSetting('home.heroImage');
    }
    if (form.elements.contactEmail) {
      form.elements.contactEmail.value = getSetting('contact.email');
    }
    if (form.elements.contactGithub) {
      form.elements.contactGithub.value = getSetting('contact.github');
    }
    if (form.elements.contactTelegram) {
      form.elements.contactTelegram.value = getSetting('contact.telegram');
    }
    if (form.elements.homeAboutHeading) {
      form.elements.homeAboutHeading.value = getSetting('home.about.heading');
    }
    if (form.elements.homeAboutTextAr) {
      form.elements.homeAboutTextAr.value = getSetting('home.about.textAr');
    }
    if (form.elements.homeAboutTextEn) {
      form.elements.homeAboutTextEn.value = getSetting('home.about.textEn');
    }
    if (form.elements.homeVisionHeading) {
      form.elements.homeVisionHeading.value = getSetting('home.vision.heading');
    }
    if (form.elements.homeVisionTextAr) {
      form.elements.homeVisionTextAr.value = getSetting('home.vision.textAr');
    }
    if (form.elements.homeVisionTextEn) {
      form.elements.homeVisionTextEn.value = getSetting('home.vision.textEn');
    }

    const rawOrder = getSetting('home.sections.order');
    state.homeSectionsOrder = parseHomeSectionsOrder(rawOrder);
    renderHomeSectionsOrder();

    if (form.elements.projectsSectionTitle) {
      form.elements.projectsSectionTitle.value = getSetting('home.sections.projects.title');
    }
    if (form.elements.projectsSectionViewAllTitle) {
      form.elements.projectsSectionViewAllTitle.value = getSetting('home.sections.projects.viewAllTitle');
    }
    if (form.elements.projectsSectionViewAllCta) {
      form.elements.projectsSectionViewAllCta.value = getSetting('home.sections.projects.viewAllCta');
    }
    if (form.elements.projectsSectionViewAllLink) {
      form.elements.projectsSectionViewAllLink.value = getSetting('home.sections.projects.viewAllLink');
    }

    if (form.elements.lecturesSectionTitle) {
      form.elements.lecturesSectionTitle.value = getSetting('home.sections.lectures.title');
    }
    if (form.elements.lecturesSectionViewAllTitle) {
      form.elements.lecturesSectionViewAllTitle.value = getSetting('home.sections.lectures.viewAllTitle');
    }
    if (form.elements.lecturesSectionViewAllCta) {
      form.elements.lecturesSectionViewAllCta.value = getSetting('home.sections.lectures.viewAllCta');
    }
    if (form.elements.lecturesSectionViewAllLink) {
      form.elements.lecturesSectionViewAllLink.value = getSetting('home.sections.lectures.viewAllLink');
    }

    if (form.elements.articlesSectionTitle) {
      form.elements.articlesSectionTitle.value = getSetting('home.sections.articles.title');
    }
    if (form.elements.articlesSectionViewAllTitle) {
      form.elements.articlesSectionViewAllTitle.value = getSetting('home.sections.articles.viewAllTitle');
    }
    if (form.elements.articlesSectionViewAllCta) {
      form.elements.articlesSectionViewAllCta.value = getSetting('home.sections.articles.viewAllCta');
    }
    if (form.elements.articlesSectionViewAllLink) {
      form.elements.articlesSectionViewAllLink.value = getSetting('home.sections.articles.viewAllLink');
    }

    const messageElement = refs.formMessages && refs.formMessages.settings;
    clearMessage(messageElement);
  }

  function setMessage(element, message, isSuccess) {
    if (!element) {
      return;
    }
    element.textContent = message || '';
    element.classList.toggle('success', Boolean(isSuccess));
  }

  function clearMessage(element) {
    if (!element) {
      return;
    }
    element.textContent = '';
    element.classList.remove('success');
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^\u0600-\u06FF\w\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function resetForm(resource) {
    const form = refs.forms[resource];
    if (!form) {
      return;
    }
    form.reset();
    if (resource === 'users') {
      if (form.elements.email) {
        form.elements.email.disabled = false;
      }
      if (form.elements.role) {
        form.elements.role.value = 'admin';
      }
    } else if (resource === 'profile') {
      renderProfileForm();
    } else if (resource === 'channels') {
      if (form.elements.id) {
        form.elements.id.value = '';
      }
      if (form.elements.ownerId) {
        form.elements.ownerId.value = '';
      }
    } else if (resource === 'settings') {
      renderSettingsForm();
    } else if (resource === 'teamProfile') {
      state.teamEditor.currentId = null;
      if (refs.teamMemberSelect) {
        refs.teamMemberSelect.value = '';
      }
      renderTeamEditorForm();
    }
    const message = refs.formMessages[resource];
    clearMessage(message);
  }

  function fillForm(resource, item) {
    const form = refs.forms[resource];
    if (!form || !item) {
      return;
    }

    form.elements.id.value = item.id || '';

    if (resource === 'projects' || resource === 'articles') {
      form.elements.title.value = item.title || '';
      form.elements.slug.value = item.slug || '';
      form.elements.summary.value = item.summary || '';
      form.elements.content.value = item.content || '';
      form.elements.detailUrl.value = item.detailUrl || '';
      form.elements.coverImage.value = item.coverImage || '';
      form.elements.isPublished.checked = Boolean(item.isPublished);
      if (form.elements.videoUrl) {
        form.elements.videoUrl.value = item.videoUrl || '';
      }
      if (form.elements.galleryImages) {
        form.elements.galleryImages.value = formatListForTextarea(item.galleryImages);
      }
      if (form.elements['__projectGalleryUpload']) {
        form.elements['__projectGalleryUpload'].value = '';
      }
      if (form.elements['__articleGalleryUpload']) {
        form.elements['__articleGalleryUpload'].value = '';
      }
    } else if (resource === 'lectures') {
      populateChannelSelect();
      form.elements.title.value = item.title || '';
      form.elements.description.value = item.description || '';
      form.elements.coverImage.value = item.coverImage || '';
      form.elements.videoUrl.value = item.videoUrl || '';
      form.elements.resourceUrl.value = item.resourceUrl || '';
      form.elements.category.value = item.category || '';
      if (form.elements.channelId) {
        form.elements.channelId.value = item.channelId || '';
      }
      if (form.elements.position) {
        form.elements.position.value = item.position || '';
      }
      form.elements.isPublished.checked = Boolean(item.isPublished);
    } else if (resource === 'users') {
      form.elements.email.value = item.email || '';
      form.elements.email.disabled = true;
      form.elements.displayName.value = item.displayName || '';
      if (form.elements.role) {
        form.elements.role.value = item.role || 'admin';
      }
      if (form.elements.password) {
        form.elements.password.value = '';
      }
    } else if (resource === 'channels') {
      form.elements.name.value = item.name || '';
      form.elements.slug.value = item.slug || '';
      form.elements.description.value = item.description || '';
      form.elements.heroTitle.value = item.heroTitle || '';
      form.elements.heroSubtitle.value = item.heroSubtitle || '';
      form.elements.coverImage.value = item.coverImage || '';
      if (form.elements.ownerId && isSuperAdmin()) {
        populateOwnerSelect();
        form.elements.ownerId.value = item.ownerId || '';
      }
    }
  }

  async function handleResourceSubmit(event, resource) {
    event.preventDefault();

    const form = refs.forms[resource];
    const message = refs.formMessages[resource];
    clearMessage(message);

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const id = formData.get('id');
    const clean = (value) => (value === undefined || value === null ? '' : String(value).trim());

    try {
      if (resource === 'profile') {
        const profileSlug = clean(formData.get('profileSlug'));
        const profileHeadline = formData.get('profileHeadline') || '';
        const isProfileVisible = Boolean(formData.get('profileVisible'));
        const profileHeroImage = clean(formData.get('profileHeroImage'));
        const profileContactLinks = formData.get('profileContactLinks') || '';

        const payload = {
          displayName: clean(formData.get('displayName')),
          avatarUrl: clean(formData.get('avatarUrl')),
          bio: formData.get('bio') || '',
          badges: formData.get('badges') || '',
          certificates: formData.get('certificates') || '',
          profileSlug,
          profileHeadline,
          profileVisible: isProfileVisible ? 'true' : 'false',
          profileHeroImage,
          profileContactLinks,
        };

        if (!payload.displayName) {
          setMessage(message, 'الرجاء إدخال الاسم المعروض.');
          return;
        }

        if (payload.profileSlug && !/^[a-z0-9-]+$/.test(payload.profileSlug)) {
          setMessage(message, 'يمكن للمعرّف أن يحتوي على الحروف اللاتينية الصغيرة والأرقام والشرطات فقط.');
          return;
        }

        if (isProfileVisible && !payload.profileSlug) {
          setMessage(message, 'الرجاء تحديد معرّف الملف قبل عرضه في صفحة الفريق.');
          return;
        }

        await CyberXApi.updateProfile(payload);
        await loadProfile();
        setMessage(message, 'تم تحديث الملف الشخصي.', true);
        renderProfileForm();
        refreshPanel('overview');
        return;
      }

      if (resource === 'channels') {
        const payload = {
          name: clean(formData.get('name')),
          slug: clean(formData.get('slug')),
          description: formData.get('description') || '',
          heroTitle: clean(formData.get('heroTitle')),
          heroSubtitle: clean(formData.get('heroSubtitle')),
          coverImage: clean(formData.get('coverImage')),
        };

        if (!payload.name || !payload.slug) {
          setMessage(message, 'الرجاء إدخال الاسم والمعرّف.');
          return;
        }

        if (isSuperAdmin()) {
          const ownerId = clean(formData.get('ownerId'));
          if (ownerId) {
            payload.ownerId = ownerId;
          }
        }

        if (id) {
          await CyberXApi.updateChannel(id, payload);
        } else {
          await CyberXApi.createChannel(payload);
        }

        setMessage(message, 'تم حفظ القناة بنجاح.', true);
        resetForm('channels');
        await loadResource('channels');
        populateChannelSelect();
        renderChannelList(state.data.channels);
        updateOverviewHints();
        return;
      }

      if (resource === 'projects' || resource === 'articles') {
        const payload = {
          title: clean(formData.get('title')),
          slug: clean(formData.get('slug')),
          summary: formData.get('summary') || '',
          content: formData.get('content') || '',
          detailUrl: clean(formData.get('detailUrl')),
          coverImage: clean(formData.get('coverImage')),
          isPublished: Boolean(form.elements.isPublished && form.elements.isPublished.checked),
        };

        if (form.elements.videoUrl) {
          payload.videoUrl = clean(formData.get('videoUrl'));
        }

        if (form.elements.galleryImages) {
          const galleryValue = formData.get('galleryImages');
          payload.galleryImages = parseTextareaList(galleryValue);
        }

        if (!payload.title || !payload.slug) {
          setMessage(message, 'الرجاء تعبئة العنوان والمعرّف.');
          return;
        }

        if (!payload.detailUrl && payload.slug) {
          payload.detailUrl = resource === 'projects'
            ? `Projects/detail.html?slug=${encodeURIComponent(payload.slug)}`
            : `Articles/detail.html?slug=${encodeURIComponent(payload.slug)}`;
        }

        if (resource === 'projects') {
          if (id) {
            await CyberXApi.updateProject(id, payload);
          } else {
            await CyberXApi.createProject(payload);
          }
        } else if (resource === 'articles') {
          if (id) {
            await CyberXApi.updateArticle(id, payload);
          } else {
            await CyberXApi.createArticle(payload);
          }
        }

        setMessage(message, 'تم الحفظ بنجاح.', true);
        resetForm(resource);
        await loadResource(resource);
        renderList(resource, state.data[resource]);
        updateOverviewHints();
        return;
      }

      if (resource === 'lectures') {
        const payload = {
          title: clean(formData.get('title')),
          description: formData.get('description') || '',
          coverImage: clean(formData.get('coverImage')),
          videoUrl: clean(formData.get('videoUrl')),
          resourceUrl: clean(formData.get('resourceUrl')),
          category: clean(formData.get('category')),
          isPublished: Boolean(form.elements.isPublished && form.elements.isPublished.checked),
        };

        const channelId = clean(formData.get('channelId'));
        if (!payload.title || !channelId) {
          setMessage(message, 'الرجاء إدخال العنوان واختيار القناة.');
          return;
        }

        payload.channelId = channelId;

        const position = clean(formData.get('position'));
        if (position) {
          payload.position = Number(position);
        }

        if (id) {
          await CyberXApi.updateLecture(id, payload);
        } else {
          await CyberXApi.createLecture(payload);
        }

        setMessage(message, 'تم حفظ المحاضرة.', true);
        resetForm('lectures');
        await loadResource('lectures');
        renderLectureList(state.data.lectures);
        updateOverviewHints();
        return;
      }

      if (resource === 'settings') {
        const payload = {
          homeHeroImage: clean(formData.get('homeHeroImage')),
          homeHeroTitle: clean(formData.get('homeHeroTitle')),
          homeHeroLineAr: clean(formData.get('homeHeroLineAr')),
          homeHeroLineEn: clean(formData.get('homeHeroLineEn')),
          contactEmail: clean(formData.get('contactEmail')),
          contactGithub: clean(formData.get('contactGithub')),
          contactTelegram: clean(formData.get('contactTelegram')),
          homeAboutHeading: clean(formData.get('homeAboutHeading')),
          homeAboutTextAr: clean(formData.get('homeAboutTextAr')),
          homeAboutTextEn: clean(formData.get('homeAboutTextEn')),
          homeVisionHeading: clean(formData.get('homeVisionHeading')),
          homeVisionTextAr: clean(formData.get('homeVisionTextAr')),
          homeVisionTextEn: clean(formData.get('homeVisionTextEn')),
          projectsSectionTitle: clean(formData.get('projectsSectionTitle')),
          projectsSectionViewAllTitle: clean(formData.get('projectsSectionViewAllTitle')),
          projectsSectionViewAllCta: clean(formData.get('projectsSectionViewAllCta')),
          projectsSectionViewAllLink: clean(formData.get('projectsSectionViewAllLink')),
          lecturesSectionTitle: clean(formData.get('lecturesSectionTitle')),
          lecturesSectionViewAllTitle: clean(formData.get('lecturesSectionViewAllTitle')),
          lecturesSectionViewAllCta: clean(formData.get('lecturesSectionViewAllCta')),
          lecturesSectionViewAllLink: clean(formData.get('lecturesSectionViewAllLink')),
          articlesSectionTitle: clean(formData.get('articlesSectionTitle')),
          articlesSectionViewAllTitle: clean(formData.get('articlesSectionViewAllTitle')),
          articlesSectionViewAllCta: clean(formData.get('articlesSectionViewAllCta')),
          articlesSectionViewAllLink: clean(formData.get('articlesSectionViewAllLink')),
        };

        const order = parseHomeSectionsOrder(state.homeSectionsOrder);
        payload.homeSectionsOrder = order;
        state.homeSectionsOrder = order;

        try {
          setMessage(message, 'جاري حفظ الإعدادات...', false);
          const updated = await CyberXApi.updateSiteSettings(payload);
          state.data.settings = updated || {};
          renderSettingsForm();
          setMessage(message, 'تم حفظ الإعدادات.', true);
        } catch (error) {
          console.error('Failed to update settings', error);
          setMessage(message, error.message || 'تعذر حفظ الإعدادات.');
        }
        return;
      }

      if (resource === 'teamProfile') {
        if (!isSuperAdmin()) {
          setMessage(message, 'لا تملك صلاحية تعديل ملفات الفريق.');
          return;
        }

        const memberId = clean(formData.get('memberId')) || clean(formData.get('id'));
        if (!memberId) {
          setMessage(message, 'الرجاء اختيار عضو من القائمة.');
          return;
        }

        const profileSlug = clean(formData.get('profileSlug'));
        const payload = {
          displayName: clean(formData.get('displayName')),
          profileSlug,
          profileHeadline: formData.get('profileHeadline') || '',
          avatarUrl: clean(formData.get('avatarUrl')),
          profileHeroImage: clean(formData.get('profileHeroImage')),
          bio: formData.get('bio') || '',
          badges: formData.get('badges') || '',
          certificates: formData.get('certificates') || '',
          profileContactLinks: formData.get('profileContactLinks') || '',
          profileVisible: form.elements.profileVisible && form.elements.profileVisible.checked ? 'true' : 'false',
        };

        const positionInput = formData.get('profilePosition');
        if (positionInput !== null && positionInput !== undefined && String(positionInput).trim() !== '') {
          payload.profilePosition = String(positionInput).trim();
        } else {
          payload.profilePosition = null;
        }

        if (!payload.displayName) {
          setMessage(message, 'الرجاء إدخال الاسم المعروض.');
          return;
        }

        if (payload.profileVisible === 'true' && !profileSlug) {
          setMessage(message, 'الرجاء تحديد معرّف الملف عند إظهاره للجمهور.');
          return;
        }

        if (profileSlug && !/^[a-z0-9-]+$/.test(profileSlug)) {
          setMessage(message, 'يمكن للمعرّف أن يحتوي على الحروف اللاتينية الصغيرة والأرقام والشرطات فقط.');
          return;
        }

        try {
          setMessage(message, 'جاري حفظ بيانات العضو...', false);
          const updatedMember = await CyberXApi.updateTeamProfile(memberId, payload);
          if (updatedMember) {
            const members = Array.isArray(state.data.team) ? [...state.data.team] : [];
            const index = members.findIndex((entry) => String(entry.id) === String(updatedMember.id));
            if (index !== -1) {
              members[index] = updatedMember;
            } else {
              members.push(updatedMember);
            }
            state.data.team = members;
            state.teamEditor.currentId = String(updatedMember.id);
            renderTeamOrderList(state.data.team);
            populateTeamMemberSelect(true);
            renderTeamEditorForm();
          }
          setMessage(message, 'تم حفظ بيانات العضو.', true);
        } catch (error) {
          console.error('Failed to update team member', error);
          setMessage(message, error.message || 'تعذر حفظ بيانات العضو.');
        }
        return;
      }

      if (resource === 'users') {
        if (!isSuperAdmin()) {
          setMessage(message, 'لا تملك الصلاحيات لإدارة المستخدمين.');
          return;
        }

        const payload = {
          email: clean(formData.get('email')),
          displayName: clean(formData.get('displayName')),
          role: clean(formData.get('role')) || 'admin',
        };

        const passwordValue = clean(formData.get('password'));

        if (!payload.displayName) {
          setMessage(message, 'الرجاء إدخال الاسم المعروض.');
          return;
        }

        if (!id) {
          if (!payload.email) {
            setMessage(message, 'الرجاء إدخال البريد الإلكتروني.');
            return;
          }
          if (!passwordValue) {
            setMessage(message, 'الرجاء تعيين كلمة مرور للمستخدم الجديد.');
            return;
          }
          payload.password = passwordValue;
        } else {
          delete payload.email;
          if (passwordValue) {
            payload.password = passwordValue;
          }
        }

        if (id) {
          await CyberXApi.updateUser(id, payload);
        } else {
          await CyberXApi.createUser(payload);
        }

        setMessage(message, 'تم حفظ المستخدم.', true);
        resetForm('users');
        await loadResource('users');
        renderUserList(state.data.users);
        populateOwnerSelect();
      }
    } catch (error) {
      console.error(`Failed to save ${resource}`, error);
      setMessage(message, error.message || 'حدث خطأ أثناء الحفظ.');
    }
  }

  function renderList(resource, items) {
    if (resource === 'activity') {
      renderActivityLog(items);
      return;
    }

    if (resource === 'channels') {
      renderChannelList(items);
      return;
    }

    if (resource === 'lectures') {
      renderLectureList(items);
      return;
    }

    if (resource === 'users') {
      renderUserList(items);
      return;
    }

    renderContentList(resource, items);
  }

  function renderContentList(resource, items) {
    const list = refs.lists[resource];
    if (!list) {
      return;
    }

    list.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      list.appendChild(createEmptyMessage('لا توجد عناصر بعد.'));
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'list-item';

      const title = document.createElement('h3');
      title.textContent = item.title || '—';
      card.appendChild(title);

      if (item.summary || item.description) {
        const summary = document.createElement('p');
        summary.textContent = (item.summary || item.description || '').slice(0, 200);
        card.appendChild(summary);
      }

      const metaRow = document.createElement('div');
      metaRow.className = 'row';
      const status = document.createElement('span');
      status.className = 'tag';
      status.textContent = item.isPublished ? 'منشور' : 'مسودة';
      metaRow.appendChild(status);

      if (item.slug) {
        const slugTag = document.createElement('span');
        slugTag.className = 'tag';
        slugTag.textContent = item.slug;
        metaRow.appendChild(slugTag);
      }

      if (item.category) {
        const categoryTag = document.createElement('span');
        categoryTag.className = 'tag';
        categoryTag.textContent = item.category;
        metaRow.appendChild(categoryTag);
      }

      if (item.videoUrl) {
        const videoTag = document.createElement('span');
        videoTag.className = 'tag';
        videoTag.textContent = 'فيديو مرفق';
        metaRow.appendChild(videoTag);
      }

      if (Array.isArray(item.galleryImages) && item.galleryImages.length) {
        const galleryTag = document.createElement('span');
        galleryTag.className = 'tag';
        galleryTag.textContent = `صور: ${item.galleryImages.length}`;
        metaRow.appendChild(galleryTag);
      }

      if (item.publishedAt) {
        const publishedTag = document.createElement('span');
        publishedTag.className = 'tag';
        publishedTag.textContent = `منذ ${new Date(item.publishedAt).toLocaleDateString('ar-IQ')}`;
        metaRow.appendChild(publishedTag);
      }

      card.appendChild(metaRow);

      const actions = document.createElement('div');
      actions.className = 'row';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary';
      editButton.textContent = 'تعديل';
      editButton.addEventListener('click', () => {
        fillForm(resource, item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      actions.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.textContent = 'حذف';
      deleteButton.addEventListener('click', async () => {
        const confirmed = window.confirm('هل أنت متأكد من حذف هذا العنصر؟');
        if (!confirmed) {
          return;
        }
        try {
          if (resource === 'projects') {
            await CyberXApi.deleteProject(item.id);
          } else if (resource === 'articles') {
            await CyberXApi.deleteArticle(item.id);
          }
          await loadResource(resource);
          renderContentList(resource, state.data[resource]);
          updateOverviewHints();
        } catch (error) {
          console.error(`Failed to delete ${resource}`, error);
          window.alert('حدث خطأ أثناء الحذف.');
        }
      });
      actions.appendChild(deleteButton);

      card.appendChild(actions);

      list.appendChild(card);
    });
  }
})();
