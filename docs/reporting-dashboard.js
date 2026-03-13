(function () {
  var statusText = document.getElementById('statusText');
  var resultCount = document.getElementById('resultCount');
  var results = document.getElementById('results');
  var accessToken = document.getElementById('accessToken');
  var companyFilter = document.getElementById('companyFilter');
  var dateFilter = document.getElementById('dateFilter');
  var clearBtn = document.getElementById('clearBtn');
  var refreshBtn = document.getElementById('refreshBtn');

  var rows = [];
  var SESSION_TOKEN_KEY = 'tangerine_reporting_access_token';

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
      metadata && metadata.business,
      row.session_id,
      row.sessionId
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
    if (typeof msg === 'string') return { role: 'system', text: msg };
    if (typeof msg !== 'object') return null;

    var text = pickFirstNonEmpty(msg.text, msg.content, msg.message, msg.body, msg.output);
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

      if (!buckets[key]) {
        buckets[key] = {
          id: key,
          company: rowCompany,
          createdAt: rowDate,
          messages: []
        };
      }

      if (!buckets[key].company && rowCompany) {
        buckets[key].company = rowCompany;
      }

      if (rowDate && (!buckets[key].createdAt || rowDate > buckets[key].createdAt)) {
        buckets[key].createdAt = rowDate;
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
          createdAt: bucket.createdAt,
          createdAtLabel: bucket.createdAt ? bucket.createdAt.toLocaleString() : 'Unknown date',
          dateKey: bucket.createdAt ? bucket.createdAt.toISOString().slice(0, 10) : '',
          messages: bucket.messages
        };
      })
      .sort(function (a, b) {
        if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return String(b.id).localeCompare(String(a.id));
      });
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

      left.appendChild(createEl('p', 'history-company', row.company || 'N/A'));
      left.appendChild(createEl('p', 'history-meta', 'Session: ' + String(row.id)));

      right.appendChild(createEl('p', 'history-date', row.createdAtLabel));
      right.appendChild(createEl('p', 'history-meta', row.messages.length + ' parsed messages'));

      if (row.messages.length === 0) {
        body.appendChild(createEl('div', 'message-row system', 'No parseable messages found in this row.'));
      } else {
        row.messages.forEach(function (msg) {
          var role = msg.role === 'user' || msg.role === 'bot' ? msg.role : 'system';
          body.appendChild(createEl('div', 'message-row ' + role, '[' + role.toUpperCase() + '] ' + msg.text));
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
    var dateTerm = dateFilter.value;

    var filtered = rows.filter(function (row) {
      var companyMatch = !companyTerm || (row.company && row.company.toLowerCase().includes(companyTerm));
      var dateMatch = !dateTerm || row.dateKey === dateTerm;
      return companyMatch && dateMatch;
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

  accessToken.value = getStoredToken();
  accessToken.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadData();
    }
  });

  companyFilter.addEventListener('input', applyFilters);
  dateFilter.addEventListener('change', applyFilters);
  clearBtn.addEventListener('click', function () {
    companyFilter.value = '';
    dateFilter.value = '';
    applyFilters();
  });
  refreshBtn.addEventListener('click', loadData);

  setStatus('Enter your dashboard access token to load chat histories.');
  renderEmpty('This page now uses a secure reporting endpoint instead of direct browser access to Supabase.');
  setCount('0 results');
})();
