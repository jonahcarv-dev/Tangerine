(function () {
  var statusText = document.getElementById('statusText');
  var resultCount = document.getElementById('resultCount');
  var results = document.getElementById('results');
  var companyFilter = document.getElementById('companyFilter');
  var dateFilter = document.getElementById('dateFilter');
  var clearBtn = document.getElementById('clearBtn');
  var refreshBtn = document.getElementById('refreshBtn');

  var rows = [];
  var client = null;

  function setStatus(text) {
    statusText.textContent = text;
  }

  function setCount(text) {
    resultCount.textContent = text;
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
      metadata && metadata.business
    );
  }

  function normalizeRole(role) {
    var raw = (role || '').toString().trim().toLowerCase();
    if (raw === 'assistant') return 'bot';
    if (raw === 'ai') return 'bot';
    if (raw === 'human') return 'user';
    if (raw === 'client') return 'user';
    if (raw === 'bot') return 'bot';
    if (raw === 'user') return 'user';
    return 'system';
  }

  function normalizeMessagesFromArray(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
      .map(function (msg) {
        if (msg == null) return null;
        if (typeof msg === 'string') {
          return { role: 'system', text: msg };
        }
        if (typeof msg === 'object') {
          var text = pickFirstNonEmpty(msg.text, msg.content, msg.message, msg.body, msg.output);
          if (!text) return null;
          return { role: normalizeRole(msg.role), text: text };
        }
        return null;
      })
      .filter(Boolean);
  }

  function detectMessages(row) {
    var candidates = [row.chat_history, row.messages, row.history, row.transcript, row.conversation, row.payload, row.data];

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (candidate == null) continue;

      if (Array.isArray(candidate)) {
        var fromArray = normalizeMessagesFromArray(candidate);
        if (fromArray.length > 0) return fromArray;
      }

      if (typeof candidate === 'object') {
        if (Array.isArray(candidate.messages)) {
          var nested = normalizeMessagesFromArray(candidate.messages);
          if (nested.length > 0) return nested;
        }
        if (Array.isArray(candidate.chat_history)) {
          var nestedHistory = normalizeMessagesFromArray(candidate.chat_history);
          if (nestedHistory.length > 0) return nestedHistory;
        }
      }

      if (typeof candidate === 'string') {
        var parsed = safeParseJson(candidate);
        if (Array.isArray(parsed)) {
          var parsedArr = normalizeMessagesFromArray(parsed);
          if (parsedArr.length > 0) return parsedArr;
        }
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.messages)) {
            var parsedNested = normalizeMessagesFromArray(parsed.messages);
            if (parsedNested.length > 0) return parsedNested;
          }
          if (Array.isArray(parsed.chat_history)) {
            var parsedNestedHistory = normalizeMessagesFromArray(parsed.chat_history);
            if (parsedNestedHistory.length > 0) return parsedNestedHistory;
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
    var messages = detectMessages(row);

    return {
      id: row.id || row.session_id || row.sessionId || index + 1,
      company: company,
      createdAt: createdAt,
      createdAtLabel: createdAt ? createdAt.toLocaleString() : 'Unknown date',
      dateKey: createdAt ? createdAt.toISOString().slice(0, 10) : '',
      messages: messages,
      raw: row
    };
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }

  function renderEmpty(text) {
    results.innerHTML = '';
    var empty = createEl('div', 'empty-state', text);
    results.appendChild(empty);
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
      left.appendChild(createEl('p', 'history-company', row.company || 'N/A'));
      left.appendChild(createEl('p', 'history-meta', 'Session: ' + String(row.id)));

      var right = createEl('div');
      right.appendChild(createEl('p', 'history-date', row.createdAtLabel));
      right.appendChild(createEl('p', 'history-meta', row.messages.length + ' parsed messages'));

      head.appendChild(left);
      head.appendChild(right);

      var body = createEl('div', 'history-body');
      if (row.messages.length === 0) {
        body.appendChild(createEl('div', 'message-row system', 'No parseable messages found in this row.'));
      } else {
        row.messages.forEach(function (msg) {
          var role = msg.role === 'user' || msg.role === 'bot' ? msg.role : 'system';
          var text = '[' + role.toUpperCase() + '] ' + msg.text;
          body.appendChild(createEl('div', 'message-row ' + role, text));
        });
      }

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

  async function queryChatHistories(tableName) {
    var query = client.from(tableName).select('*').limit(500);

    var withOrder = await query.order('created_at', { ascending: false });
    if (!withOrder.error) return withOrder;

    var fallback = await client.from(tableName).select('*').limit(500);
    return fallback;
  }

  function readConfig() {
    var cfg = window.TANGERINE_CONFIG || {};
    return {
      supabaseUrl: cfg.supabaseUrl || (cfg.supabase && cfg.supabase.url) || '',
      supabaseAnonKey: cfg.supabaseAnonKey || (cfg.supabase && cfg.supabase.anonKey) || '',
      tableName: cfg.chatHistoriesTable || 'Chat histories'
    };
  }

  function looksLikeServiceRoleKey(key) {
    return typeof key === 'string' && key.indexOf('service_role') !== -1;
  }

  async function loadData() {
    var cfg = readConfig();

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      setStatus('Supabase client failed to load.');
      renderEmpty('Could not initialize Supabase client library.');
      return;
    }

    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      setStatus('Missing Supabase config in docs/config.js.');
      renderEmpty('Add supabaseUrl and supabaseAnonKey to docs/config.js before using this dashboard.');
      return;
    }

    if (looksLikeServiceRoleKey(cfg.supabaseAnonKey)) {
      setStatus('Unsafe key detected.');
      renderEmpty('Do not use a service role key in browser code. Use the Supabase anon key only.');
      return;
    }

    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    setStatus('Loading chat histories...');

    try {
      var response = await queryChatHistories(cfg.tableName);
      if (response.error) {
        throw response.error;
      }

      rows = (response.data || []).map(normalizeRow);
      setStatus('Loaded from table "' + cfg.tableName + '".');
      applyFilters();
    } catch (error) {
      setStatus('Unable to load chat histories.');
      renderEmpty('Supabase query failed. Confirm table access and RLS policies for anon read access.');
      setCount('0 results');
      console.error('Dashboard query error:', error);
    }
  }

  companyFilter.addEventListener('input', applyFilters);
  dateFilter.addEventListener('change', applyFilters);
  clearBtn.addEventListener('click', function () {
    companyFilter.value = '';
    dateFilter.value = '';
    applyFilters();
  });
  refreshBtn.addEventListener('click', loadData);

  loadData();
})();
