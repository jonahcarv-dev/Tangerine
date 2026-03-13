(function () {
  var statusText = document.getElementById('statusText');
  var resultCount = document.getElementById('resultCount');
  var results = document.getElementById('results');
  var accessToken = document.getElementById('accessToken');
  var companyFilter = document.getElementById('companyFilter');
  var userTypeFilter = document.getElementById('userTypeFilter');
  var datePresetFilter = document.getElementById('datePresetFilter');
  var customDateRange = document.getElementById('customDateRange');
  var dateStartFilter = document.getElementById('dateStartFilter');
  var dateEndFilter = document.getElementById('dateEndFilter');
  var clearBtn = document.getElementById('clearBtn');
  var refreshBtn = document.getElementById('refreshBtn');

  var rows = [];
  var SESSION_TOKEN_KEY = 'tangerine_reporting_access_token';
  var autoRefreshTimer = null;

  function setStatus(text) {
    statusText.textContent = text;
  }

  function setCount(text) {
    resultCount.textContent = text;
  }

  function getStoredToken() {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
    } catch (_error) {
      return '';
    }
  }

  function storeToken(value) {
    try {
      if (value) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, value);
      } else {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function safeParseJson(value) {
    if (!value || typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch (_e) {
      return null;
    }
  }

  function cleanMessageText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\\n/g, '\n').trim();
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function linkifyText(text) {
    var escaped = escapeHtml(text);
    escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, function (_m, url) {
      var clean = url.replace(/[.,;:!?)]+$/, '');
      var trailing = url.slice(clean.length);
      return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + trailing;
    });
    escaped = escaped.replace(/\n/g, '<br>');
    return escaped;
  }

  function normalizeDate(value) {
    if (!value) return null;
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function pickFirstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var candidate = arguments[i];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return '';
  }

  function detectCompany(row) {
    var metadata = row.metadata;
    if (typeof metadata === 'string') metadata = safeParseJson(metadata);
    return pickFirstNonEmpty(
      row.company_name,
      row.company,
      row.business_name,
      row.organization,
      metadata && metadata.company,
      metadata && metadata.business
    );
  }

  function normalizeRole(role) {
    var raw = (role || '').toString().trim().toLowerCase();
    if (raw === 'assistant' || raw === 'ai' || raw === 'bot') return 'bot';
    if (raw === 'human' || raw === 'client' || raw === 'user') return 'user';
    return 'system';
  }

  function normalizeMessagesFromArray(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
      .map(function (msg) {
        return normalizeSingleMessage(msg);
      })
      .filter(Boolean);
  }

  function normalizeSingleMessage(msg) {
    if (msg == null) return null;
    if (typeof msg === 'string') return { role: 'system', text: cleanMessageText(msg) };
    if (typeof msg !== 'object') return null;

    var text = cleanMessageText(pickFirstNonEmpty(msg.text, msg.content, msg.message, msg.body, msg.output));
    if (!text) return null;

    return {
      role: normalizeRole(msg.role || msg.type || msg.sender),
      text: text
    };
  }

  function detectMessages(row) {
    var candidates = [row.message, row.chat_history, row.messages, row.history, row.transcript, row.conversation, row.payload, row.data];

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (candidate == null) continue;

      if (Array.isArray(candidate)) {
        var fromArray = normalizeMessagesFromArray(candidate);
        if (fromArray.length > 0) return fromArray;
      }

      if (typeof candidate === 'object') {
        var single = normalizeSingleMessage(candidate);
        if (single) return [single];

        if (Array.isArray(candidate.messages)) {
          var nestedMessages = normalizeMessagesFromArray(candidate.messages);
          if (nestedMessages.length > 0) return nestedMessages;
        }
        if (Array.isArray(candidate.chat_history)) {
          var nestedHistory = normalizeMessagesFromArray(candidate.chat_history);
          if (nestedHistory.length > 0) return nestedHistory;
        }
      }

      if (typeof candidate === 'string') {
        var parsed = safeParseJson(candidate);
        if (Array.isArray(parsed)) {
          var parsedArray = normalizeMessagesFromArray(parsed);
          if (parsedArray.length > 0) return parsedArray;
        }
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.messages)) {
            var parsedMessages = normalizeMessagesFromArray(parsed.messages);
            if (parsedMessages.length > 0) return parsedMessages;
          }
          if (Array.isArray(parsed.chat_history)) {
            var parsedHistory = normalizeMessagesFromArray(parsed.chat_history);
            if (parsedHistory.length > 0) return parsedHistory;
          }
        }
      }
    }

    var fallbackText = pickFirstNonEmpty(row.last_message, row.message, row.summary);
    return fallbackText ? [{ role: 'system', text: fallbackText }] : [];
  }

  function normalizeRow(row, index) {
    var company = detectCompany(row);
    var createdAt = normalizeDate(row.created_at || row.timestamp || row.createdAt || row.date || row.inserted_at || row.updated_at);

    return {
      id: row.id || row.session_id || row.sessionId || index + 1,
      company: company,
      createdAt: createdAt,
      createdAtLabel: createdAt ? createdAt.toLocaleString() : 'Unknown date',
      dateKey: createdAt ? createdAt.toISOString().slice(0, 10) : '',
      messages: detectMessages(row)
    };
  }

  function buildHistories(rawRows) {
    var buckets = {};

    rawRows.forEach(function (row, index) {
      var key = pickFirstNonEmpty(row.session_id, row.sessionId, row.id ? String(row.id) : '', 'row-' + String(index + 1));
      var rowCompany = detectCompany(row);
      var rowDate = normalizeDate(row.created_at || row.timestamp || row.createdAt || row.date || row.inserted_at || row.updated_at);
      var rowMessages = detectMessages(row);

      var rowUserType = row.user_type || row.userType || '';

      if (!buckets[key]) {
        buckets[key] = {
          id: key,
          company: rowCompany,
          userType: rowUserType,
          createdAt: rowDate,
          earliestDate: rowDate,
          messages: []
        };
      }

      if (!buckets[key].userType && rowUserType) {
        buckets[key].userType = rowUserType;
      }

      if (!buckets[key].company && rowCompany) {
        buckets[key].company = rowCompany;
      }

      if (rowDate && (!buckets[key].createdAt || rowDate > buckets[key].createdAt)) {
        buckets[key].createdAt = rowDate;
      }

      if (rowDate && (!buckets[key].earliestDate || rowDate < buckets[key].earliestDate)) {
        buckets[key].earliestDate = rowDate;
      }

      if (rowMessages.length > 0) {
        buckets[key].messages = buckets[key].messages.concat(rowMessages);
      }
    });

    return Object.keys(buckets)
      .map(function (key) {
        var bucket = buckets[key];
        return {
          id: bucket.id,
          company: bucket.company,
          userType: bucket.userType || '',
          createdAt: bucket.createdAt,
          createdAtLabel: bucket.createdAt ? bucket.createdAt.toLocaleString() : 'Unknown date',
          dateKey: bucket.createdAt ? bucket.createdAt.toISOString().slice(0, 10) : '',
          duration: formatDuration(bucket.earliestDate, bucket.createdAt),
          messages: bucket.messages.slice().reverse()
        };
      })
      .sort(function (a, b) {
        if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return String(b.id).localeCompare(String(a.id));
      });
  }

  function formatDuration(earliestDate, latestDate) {
    if (!earliestDate || !latestDate) return null;
    var now = new Date();
    var ACTIVE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

    var isActive = (now - latestDate) < ACTIVE_THRESHOLD_MS;
    var diffMs = latestDate - earliestDate;

    if (diffMs < 1000) {
      return isActive ? 'In progress' : 'Under a minute';
    }

    var totalSeconds = Math.floor(diffMs / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    var parts = [];
    if (hours > 0) parts.push(hours + 'h');
    if (minutes > 0) parts.push(minutes + 'm');
    if (hours === 0 && seconds > 0) parts.push(seconds + 's');

    var label = parts.join(' ');
    return isActive ? label + ' (in progress)' : label;
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }

  function renderEmpty(text) {
    results.innerHTML = '';
    results.appendChild(createEl('div', 'empty-state', text));
  }

  function formatSessionId(id) {
    var s = String(id);
    return s.length > 12 ? '\u2026' + s.slice(-8) : s;
  }

  function renderRows(list) {
    results.innerHTML = '';

    if (list.length === 0) {
      renderEmpty('No chat histories match the current filters.');
      return;
    }

    list.forEach(function (row) {
      var card = createEl('article', 'history-card');
      var head = createEl('div', 'history-head');
      var left = createEl('div');
      var right = createEl('div');
      var body = createEl('div', 'history-body');

      var companyEl;
      if (row.company) {
        companyEl = createEl('p', 'history-company', row.company);
      } else {
        companyEl = createEl('p', 'history-company-muted', 'No company');
      }

      if (row.userType) {
        var badgeClass = row.userType === 'business' ? 'business' : 'individual';
        var badgeLabel = row.userType === 'business' ? 'Business' : 'Individual';
        var badge = createEl('span', 'user-type-badge ' + badgeClass, badgeLabel);
        companyEl.appendChild(badge);
      }

      left.appendChild(companyEl);
      left.appendChild(createEl('p', 'history-meta', 'Session: ' + formatSessionId(row.id)));

      right.appendChild(createEl('p', 'history-date', row.createdAtLabel));
      var metaLine = createEl('p', 'history-meta');
      metaLine.textContent = row.messages.length + ' message' + (row.messages.length === 1 ? '' : 's');
      if (row.duration) {
        var sep = document.createTextNode('  \u00B7  ');
        metaLine.appendChild(sep);
        var isActive = row.duration.indexOf('in progress') !== -1;
        var durationSpan = createEl('span', isActive ? 'duration-active' : '', row.duration);
        metaLine.appendChild(durationSpan);
      }
      right.appendChild(metaLine);

      if (row.messages.length === 0) {
        body.appendChild(createEl('div', 'message-row system', 'No parseable messages found.'));
      } else {
        row.messages.forEach(function (msg) {
          var role = msg.role === 'user' || msg.role === 'bot' ? msg.role : 'system';
          var msgEl = createEl('div', 'message-row ' + role);
          var roleLabel = createEl('span', 'msg-role-label', role === 'bot' ? 'Bot' : role === 'user' ? 'User' : 'System');
          var textEl = createEl('span', 'msg-text');
          textEl.innerHTML = linkifyText(msg.text);
          msgEl.appendChild(roleLabel);
          msgEl.appendChild(textEl);
          body.appendChild(msgEl);
        });
      }

      head.appendChild(left);
      head.appendChild(right);
      card.appendChild(head);
      card.appendChild(body);
      results.appendChild(card);
    });
  }

  function applyFilters() {
    var companyTerm = companyFilter.value.trim().toLowerCase();
    var selectedUserType = userTypeFilter.value;
    var datePreset = datePresetFilter.value;
    var now = new Date();

    function startOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    function endOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }

    function shiftDays(base, days) {
      var next = new Date(base);
      next.setDate(next.getDate() + days);
      return next;
    }

    function shiftMonths(base, months) {
      var next = new Date(base);
      next.setMonth(next.getMonth() + months);
      return next;
    }

    function parseDateInput(value) {
      if (!value) return null;
      var parts = value.split('-');
      if (parts.length !== 3) return null;

      var year = Number(parts[0]);
      var month = Number(parts[1]);
      var day = Number(parts[2]);

      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

      return new Date(year, month - 1, day);
    }

    function computeDateBounds() {
      if (datePreset === 'today') {
        return { start: startOfDay(now), end: endOfDay(now) };
      }
      if (datePreset === 'past_week') {
        return { start: startOfDay(shiftDays(now, -6)), end: endOfDay(now) };
      }
      if (datePreset === 'past_month') {
        return { start: startOfDay(shiftMonths(now, -1)), end: endOfDay(now) };
      }
      if (datePreset === 'past_3_months') {
        return { start: startOfDay(shiftMonths(now, -3)), end: endOfDay(now) };
      }
      if (datePreset === 'custom') {
        var startDate = parseDateInput(dateStartFilter.value);
        var endDate = parseDateInput(dateEndFilter.value);
        var start = startDate ? startOfDay(startDate) : null;
        var end = endDate ? endOfDay(endDate) : null;
        if (!start || !end) return { incomplete: true };
        return { start: start, end: end };
      }
      return null;
    }

    var dateBounds = computeDateBounds();

    var filtered = rows.filter(function (row) {
      var companyMatch = !companyTerm || (row.company && row.company.toLowerCase().includes(companyTerm));

      var normalizedType = String(row.userType || '').toLowerCase();
      var isCompanyConversation = normalizedType === 'business';
      var isIndividualConversation = normalizedType === 'individual' || normalizedType === 'self' || (!normalizedType && !row.company);

      var userTypeMatch = true;
      if (selectedUserType === 'company') {
        userTypeMatch = isCompanyConversation;
      } else if (selectedUserType === 'individual') {
        userTypeMatch = isIndividualConversation;
      }

      var dateMatch = true;
      if (dateBounds) {
        if (dateBounds.incomplete) {
          dateMatch = false;
        } else {
          dateMatch = !!row.createdAt && row.createdAt >= dateBounds.start && row.createdAt <= dateBounds.end;
        }
      }

      return companyMatch && userTypeMatch && dateMatch;
    });

    renderRows(filtered);
    setCount(filtered.length + ' result' + (filtered.length === 1 ? '' : 's'));
  }

  function readConfig() {
    var cfg = window.TANGERINE_CONFIG || {};
    var parsedLimit = Number(cfg.reportingLimit || 0);
    return {
      reportingApiUrl: cfg.reportingApiUrl || '',
      reportingLimit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 0
    };
  }

  async function loadData() {
    var cfg = readConfig();
    var token = accessToken.value.trim();

    if (!cfg.reportingApiUrl) {
      setStatus('Missing reportingApiUrl in docs/config.js.');
      renderEmpty('Add the secure reporting endpoint URL to docs/config.js before using this dashboard.');
      setCount('0 results');
      return;
    }

    if (!token) {
      setStatus('Access token required.');
      renderEmpty('Enter the dashboard access token to load chat histories.');
      setCount('0 results');
      return;
    }

    storeToken(token);

    var requestUrl = new URL(cfg.reportingApiUrl);
    if (cfg.reportingLimit > 0) {
      requestUrl.searchParams.set('limit', String(Math.floor(cfg.reportingLimit)));
    }

    setStatus('Loading chat histories...');

    try {
      var response = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: {
          'x-dashboard-token': token
        }
      });

      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        if (response.status === 401) {
          storeToken('');
          throw new Error('Access token was rejected.');
        }
        throw new Error(payload.error || 'Request failed.');
      }

      rows = buildHistories(Array.isArray(payload.rows) ? payload.rows : []);
      setStatus('Loaded secure reporting data.');
      applyFilters();
    } catch (error) {
      setStatus('Unable to load chat histories.');
      renderEmpty(error && error.message ? error.message : 'Secure reporting request failed.');
      setCount('0 results');
      console.error('Dashboard API error:', error);
    }
  }

  function scheduleAutoRefresh() {
    if (autoRefreshTimer) {
      window.clearTimeout(autoRefreshTimer);
    }

    autoRefreshTimer = window.setTimeout(function () {
      if (accessToken.value.trim()) {
        loadData();
      } else {
        applyFilters();
      }
    }, 220);
  }

  accessToken.value = getStoredToken();
  accessToken.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadData();
    }
  });

  function updateCustomDateRangeState() {
    var isCustom = datePresetFilter.value === 'custom';

    dateStartFilter.disabled = !isCustom;
    dateEndFilter.disabled = !isCustom;

    if (isCustom) {
      customDateRange.classList.remove('is-disabled');
    } else {
      customDateRange.classList.add('is-disabled');
    }
  }

  companyFilter.addEventListener('input', applyFilters);
  userTypeFilter.addEventListener('change', applyFilters);
  datePresetFilter.addEventListener('change', function () {
    updateCustomDateRangeState();
    scheduleAutoRefresh();
  });
  dateStartFilter.addEventListener('change', scheduleAutoRefresh);
  dateEndFilter.addEventListener('change', scheduleAutoRefresh);
  clearBtn.addEventListener('click', function () {
    companyFilter.value = '';
    userTypeFilter.value = 'all';
    datePresetFilter.value = 'all';
    dateStartFilter.value = '';
    dateEndFilter.value = '';
    updateCustomDateRangeState();
    applyFilters();
  });
  refreshBtn.addEventListener('click', loadData);

  updateCustomDateRangeState();

  setStatus('Enter your dashboard access token to load chat histories.');
  renderEmpty('This page now uses a secure reporting endpoint instead of direct browser access to Supabase.');
  setCount('0 results');
  // Theme toggle
  var themeToggle = document.getElementById('themeToggle');
  var THEME_KEY = 'tangerine_theme';

  var SUN_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.innerHTML = SUN_ICON;
      themeToggle.title = 'Switch to light mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.innerHTML = MOON_ICON;
      themeToggle.title = 'Switch to dark mode';
    }
  }

  var savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
})();
