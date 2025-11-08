(function initCyberXApiClient(global) {
  const API_BASE = (global.CYBERX_API_BASE || '').trim() || '/api';

  async function fetchJson(path, options = {}) {
    const fetchOptions = {
      credentials: 'include',
      ...options,
    };

    const headers = { ...(fetchOptions.headers || {}) };
    const body = fetchOptions.body;

    if (!(body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    fetchOptions.headers = headers;

    const response = await fetch(`${API_BASE}${path}`, fetchOptions);

    if (!response.ok) {
      let errorMessage = 'Request failed';

      try {
        const payload = await response.json();
        if (payload && payload.error) {
          errorMessage = payload.error;
        }
      } catch (err) {
        // Ignore JSON parsing issues and fall back to default message
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function buildQuery(params) {
    if (!params) {
      return '';
    }
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        search.append(key, value);
      }
    });
    const query = search.toString();
    return query ? `?${query}` : '';
  }

  async function fetchProjects(params) {
    return fetchJson(`/projects${buildQuery(params)}`);
  }

  async function fetchProjectBySlug(slug) {
    return fetchJson(`/projects/${encodeURIComponent(slug)}`);
  }

  async function fetchArticles(params) {
    return fetchJson(`/articles${buildQuery(params)}`);
  }

  async function fetchArticleBySlug(slug) {
    return fetchJson(`/articles/${encodeURIComponent(slug)}`);
  }

  async function fetchLectures(params) {
    return fetchJson(`/lectures${buildQuery(params)}`);
  }

  async function fetchLectureById(id) {
    return fetchJson(`/lectures/${encodeURIComponent(id)}`);
  }

  async function fetchChannels(params) {
    return fetchJson(`/channels${buildQuery(params)}`);
  }

  async function fetchChannelBySlug(slug, params) {
    return fetchJson(`/channels/${encodeURIComponent(slug)}${buildQuery(params)}`);
  }

  async function fetchTeamProfiles() {
    return fetchJson('/team');
  }

  async function fetchTeamProfileBySlug(slug) {
    return fetchJson(`/team/${encodeURIComponent(slug)}`);
  }

  async function fetchSiteSettings() {
    return fetchJson('/site-settings');
  }

  async function fetchAdminSiteSettings() {
    return fetchJson('/admin/site-settings');
  }

  async function fetchActivityLog(params) {
    return fetchJson(`/admin/activity${buildQuery(params)}`);
  }

  async function fetchUserOptions() {
    return fetchJson('/admin/user-options');
  }

  async function fetchAdminChannels() {
    return fetchJson('/admin/channels');
  }

  async function createChannel(payload) {
    return fetchJson('/admin/channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateChannel(id, payload) {
    return fetchJson(`/admin/channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function deleteChannel(id) {
    return fetchJson(`/admin/channels/${id}`, {
      method: 'DELETE',
    });
  }

  async function fetchAdminLectures() {
    return fetchJson('/admin/lectures');
  }

  async function fetchAdminTeamProfiles() {
    return fetchJson('/admin/team-profiles');
  }

  async function updateTeamOrder(payload) {
    return fetchJson('/admin/team-profiles/order', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function updateTeamProfile(id, payload) {
    return fetchJson(`/admin/team-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    });
  }

  async function deleteTeamProfile(id) {
    return fetchJson(`/admin/team-profiles/${id}`, {
      method: 'DELETE',
    });
  }

  async function login(credentials) {
    return fetchJson('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async function logout() {
    return fetchJson('/admin/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async function fetchCurrentUser() {
    return fetchJson('/admin/auth/me');
  }

  async function fetchProfile() {
    return fetchJson('/admin/profile/me');
  }

  async function updateProfile(payload) {
    return fetchJson('/admin/profile/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function createArticle(payload) {
    return fetchJson('/admin/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateArticle(id, payload) {
    return fetchJson(`/admin/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function deleteArticle(id) {
    return fetchJson(`/admin/articles/${id}`, {
      method: 'DELETE',
    });
  }

  async function createProject(payload) {
    return fetchJson('/admin/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateProject(id, payload) {
    return fetchJson(`/admin/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function deleteProject(id) {
    return fetchJson(`/admin/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async function createLecture(payload) {
    return fetchJson('/admin/lectures', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateLecture(id, payload) {
    return fetchJson(`/admin/lectures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function deleteLecture(id) {
    return fetchJson(`/admin/lectures/${id}`, {
      method: 'DELETE',
    });
  }

  async function uploadMedia(file, options = {}) {
    if (!file) {
      throw new Error('لم يتم اختيار ملف للرفع.');
    }

    const formData = new FormData();
    formData.append('file', file);

    if (options && options.folder) {
      formData.append('folder', options.folder);
    }

    const response = await fetch(`${API_BASE}/admin/uploads`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'تعذر رفع الملف';
      try {
        const payload = await response.json();
        if (payload && payload.error) {
          errorMessage = payload.error;
        }
      } catch (err) {
        // ignore parsing issues
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async function updateSiteSettings(payload) {
    return fetchJson('/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    });
  }

  async function fetchUsers() {
    return fetchJson('/admin/users');
  }

  async function createUser(payload) {
    return fetchJson('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateUser(id, payload) {
    return fetchJson(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async function deleteUser(id) {
    return fetchJson(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  global.CyberXApi = {
    fetchProjects,
    fetchProjectBySlug,
    fetchArticles,
    fetchArticleBySlug,
    fetchLectures,
    fetchLectureById,
    fetchChannels,
    fetchChannelBySlug,
    fetchTeamProfiles,
    fetchTeamProfileBySlug,
    fetchSiteSettings,
    fetchAdminSiteSettings,
    fetchActivityLog,
  fetchUserOptions,
    fetchAdminChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    fetchAdminLectures,
    login,
    logout,
    fetchCurrentUser,
    fetchProfile,
    updateProfile,
    createArticle,
    updateArticle,
    deleteArticle,
    createProject,
    updateProject,
    deleteProject,
    createLecture,
    updateLecture,
    deleteLecture,
    uploadMedia,
    updateSiteSettings,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    fetchAdminTeamProfiles,
    updateTeamOrder,
    updateTeamProfile,
    deleteTeamProfile,
  };
})(window);
