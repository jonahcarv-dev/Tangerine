(function () {
  var accessToken = document.getElementById('accessToken');
  var refreshBtn = document.getElementById('refreshBtn');
  var statusText = document.getElementById('statusText');
  var resultCount = document.getElementById('resultCount');
  var conversationCount = document.getElementById('conversationCount');
  var ratioSummary = document.getElementById('ratioSummary');
  var ratioMeta = document.getElementById('ratioMeta');
  var avgDuration = document.getElementById('avgDuration');
  var durationMeta = document.getElementById('durationMeta');
  var avgMessages = document.getElementById('avgMessages');
  var messagesMeta = document.getElementById('messagesMeta');
  var topCompany = document.getElementById('topCompany');
  var topCompanyMeta = document.getElementById('topCompanyMeta');
  var trendPresetFilter = document.getElementById('trendPresetFilter');
  var trendCustomDateRange = document.getElementById('trendCustomDateRange');
  var trendDateStartFilter = document.getElementById('trendDateStartFilter');
  var trendDateEndFilter = document.getElementById('trendDateEndFilter');

  var SESSION_TOKEN_KEY = 'tangerine_reporting_access_token';
  var ratioChart = null;
  var durationChart = null;
  var trendChart = null;
  var latestSessions = [];
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

  function readConfig() {
    var cfg = window.TANGERINE_CONFIG || {};
    var parsedLimit = Number(cfg.reportingLimit || 0);
    return {
      reportingApiUrl: cfg.reportingApiUrl || '',
      reportingLimit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 0
    };
  }

  function normalizeDate(value) {
    if (!value) return null;
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

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

  function pickFirstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var candidate = arguments[i];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return '';
  }

  function detectUserType(row) {
    var raw = String(row.user_type || row.userType || '').toLowerCase();
    if (raw === 'business') return 'business';
    if (raw === 'self' || raw === 'individual') return 'individual';
    return '';
  }

  function buildSessions(rawRows) {
    var buckets = {};

    rawRows.forEach(function (row, index) {
      var key = pickFirstNonEmpty(row.session_id, row.sessionId, row.id ? String(row.id) : '', 'row-' + String(index + 1));
      var createdAt = normalizeDate(row.created_at || row.timestamp || row.createdAt || row.date || row.inserted_at || row.updated_at);
      var userType = detectUserType(row);
      var company = pickFirstNonEmpty(row.company_name, row.company, row.business_name, row.organization);

      if (!buckets[key]) {
        buckets[key] = {
          id: key,
          userType: userType,
          company: company,
          firstAt: createdAt,
          lastAt: createdAt,
          messageCount: 0
        };
      }

      if (!buckets[key].userType && userType) {
        buckets[key].userType = userType;
      }

      if (!buckets[key].company && company) {
        buckets[key].company = company;
      }

      if (createdAt) {
        if (!buckets[key].firstAt || createdAt < buckets[key].firstAt) {
          buckets[key].firstAt = createdAt;
        }
        if (!buckets[key].lastAt || createdAt > buckets[key].lastAt) {
          buckets[key].lastAt = createdAt;
        }
      }

      buckets[key].messageCount += 1;
    });

    return Object.keys(buckets).map(function (key) {
      var session = buckets[key];
      var durationMs = 0;
      if (session.firstAt && session.lastAt) {
        durationMs = Math.max(0, session.lastAt.getTime() - session.firstAt.getTime());
      }
      return {
        id: session.id,
        userType: session.userType,
        company: session.company,
        messageCount: session.messageCount,
        durationMs: durationMs,
        startedAt: session.firstAt,
        endedAt: session.lastAt
      };
    });
  }

  function formatDuration(ms) {
    if (!ms || ms <= 0) return '0m';
    var totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 60) return totalMinutes + 'm';
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return hours + 'h ' + minutes + 'm';
  }

  function percent(count, total) {
    if (!total) return '0%';
    return Math.round((count / total) * 100) + '%';
  }

  function destroyCharts() {
    if (ratioChart) ratioChart.destroy();
    if (durationChart) durationChart.destroy();
    if (trendChart) trendChart.destroy();
    ratioChart = null;
    durationChart = null;
    trendChart = null;
  }

  function formatDateLabel(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function getTopCompanySummary(sessions) {
    var counts = {};
    sessions.forEach(function (session) {
      if (!session.company) return;
      counts[session.company] = (counts[session.company] || 0) + 1;
    });

    var entries = Object.keys(counts).map(function (name) {
      return { name: name, count: counts[name] };
    }).sort(function (left, right) {
      return right.count - left.count;
    });

    return entries.length ? entries[0] : null;
  }

  function computeTrendDateBounds() {
    var datePreset = trendPresetFilter ? trendPresetFilter.value : 'all';
    var now = new Date();

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
      var startDate = parseDateInput(trendDateStartFilter.value);
      var endDate = parseDateInput(trendDateEndFilter.value);
      var start = startDate ? startOfDay(startDate) : null;
      var end = endDate ? endOfDay(endDate) : null;
      if (!start || !end) return { incomplete: true };
      return { start: start, end: end };
    }

    return null;
  }

  function getTrendSessions(sessions) {
    var bounds = computeTrendDateBounds();
    if (!bounds) return sessions;
    if (bounds.incomplete) return [];

    return sessions.filter(function (session) {
      return !!session.startedAt && session.startedAt >= bounds.start && session.startedAt <= bounds.end;
    });
  }

  function updateTrendCustomDateRangeState() {
    if (!trendPresetFilter || !trendCustomDateRange || !trendDateStartFilter || !trendDateEndFilter) return;

    var isCustom = trendPresetFilter.value === 'custom';
    trendDateStartFilter.disabled = !isCustom;
    trendDateEndFilter.disabled = !isCustom;

    if (isCustom) {
      trendCustomDateRange.classList.remove('is-disabled');
    } else {
      trendCustomDateRange.classList.add('is-disabled');
    }
  }

  function refreshTrendChart() {
    if (!latestSessions.length) return;
    renderCharts(latestSessions);
  }

  function scheduleAnalyticsRefresh() {
    if (autoRefreshTimer) {
      window.clearTimeout(autoRefreshTimer);
    }

    autoRefreshTimer = window.setTimeout(function () {
      if (accessToken.value.trim()) {
        loadAnalytics();
      } else {
        refreshTrendChart();
      }
    }, 220);
  }

  function renderCharts(sessions) {
    destroyCharts();

    var businessCount = sessions.filter(function (session) { return session.userType === 'business'; }).length;
    var individualCount = sessions.filter(function (session) { return session.userType === 'individual'; }).length;
    var uncategorizedCount = Math.max(0, sessions.length - businessCount - individualCount);

    var ratioCtx = document.getElementById('ratioChart');
    ratioChart = new Chart(ratioCtx, {
      type: 'doughnut',
      data: {
        labels: ['Business Services', 'Job Seekers', 'Uncategorized'],
        datasets: [{
          data: [businessCount, individualCount, uncategorizedCount],
          backgroundColor: ['#f4764f', '#19224c', '#b9c2e6'],
          borderColor: ['#ffffff', '#ffffff', '#ffffff'],
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
              color: '#222b45',
              font: {
                family: 'Be Vietnam Pro'
              }
            }
          }
        }
      }
    });

    var durationBuckets = [0, 0, 0, 0];
    sessions.forEach(function (session) {
      var minutes = session.durationMs / 60000;
      if (minutes <= 1) durationBuckets[0] += 1;
      else if (minutes <= 5) durationBuckets[1] += 1;
      else if (minutes <= 15) durationBuckets[2] += 1;
      else durationBuckets[3] += 1;
    });

    var durationCtx = document.getElementById('durationChart');
    durationChart = new Chart(durationCtx, {
      type: 'bar',
      data: {
        labels: ['0-1 min', '1-5 min', '5-15 min', '15+ min'],
        datasets: [{
          label: 'Conversations',
          data: durationBuckets,
          backgroundColor: ['#dee3ff', '#c7d0ff', '#f7b08a', '#f4764f'],
          borderRadius: 10,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#5f6980',
              font: { family: 'Be Vietnam Pro' }
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#5f6980',
              font: { family: 'Be Vietnam Pro' }
            },
            grid: {
              color: 'rgba(25, 34, 76, 0.08)'
            }
          }
        }
      }
    });

    var trendSessions = getTrendSessions(sessions);
    var trendMap = {};
    trendSessions.forEach(function (session) {
      if (!session.startedAt) return;
      var key = session.startedAt.toISOString().slice(0, 10);
      trendMap[key] = (trendMap[key] || 0) + 1;
    });

    var trendKeys = Object.keys(trendMap).sort();
    var trendLabels = trendKeys.map(function (key) {
      return formatDateLabel(new Date(key + 'T00:00:00'));
    });
    var trendValues = trendKeys.map(function (key) {
      return trendMap[key];
    });

    var trendCtx = document.getElementById('trendChart');
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Sessions',
          data: trendValues,
          borderColor: '#f4764f',
          backgroundColor: 'rgba(244, 118, 79, 0.16)',
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: '#19224c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#5f6980',
              font: { family: 'Be Vietnam Pro' }
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#5f6980',
              font: { family: 'Be Vietnam Pro' }
            },
            grid: {
              color: 'rgba(25, 34, 76, 0.08)'
            }
          }
        }
      }
    });
  }

  function renderAnalytics(rawRows) {
    var sessions = buildSessions(rawRows);
    latestSessions = sessions;
    var totalSessions = sessions.length;
    var businessCount = sessions.filter(function (session) { return session.userType === 'business'; }).length;
    var individualCount = sessions.filter(function (session) { return session.userType === 'individual'; }).length;
    var uncategorizedCount = Math.max(0, totalSessions - businessCount - individualCount);
    var totalDuration = sessions.reduce(function (sum, session) { return sum + session.durationMs; }, 0);
    var avgDurationMs = totalSessions ? totalDuration / totalSessions : 0;
    var totalMessages = sessions.reduce(function (sum, session) { return sum + session.messageCount; }, 0);
    var avgMessagesPerSession = totalSessions ? (totalMessages / totalSessions) : 0;
    var topCompanySummary = getTopCompanySummary(sessions);

    conversationCount.textContent = String(totalSessions);
    ratioSummary.textContent = businessCount + ' business / ' + individualCount + ' job seekers';
    ratioMeta.textContent = percent(businessCount, totalSessions) + ' business, ' + percent(individualCount, totalSessions) + ' job seekers' + (uncategorizedCount ? ', ' + percent(uncategorizedCount, totalSessions) + ' uncategorized' : '');
    avgDuration.textContent = formatDuration(avgDurationMs);
    durationMeta.textContent = 'Average across ' + totalSessions + ' conversations. Longest session: ' + formatDuration(sessions.reduce(function (max, session) { return Math.max(max, session.durationMs); }, 0)) + '.';
    avgMessages.textContent = totalSessions ? avgMessagesPerSession.toFixed(1) : '0';
    messagesMeta.textContent = totalMessages + ' total messages captured across the current data pull.';
    topCompany.textContent = topCompanySummary ? topCompanySummary.name : 'No company data';
    topCompanyMeta.textContent = topCompanySummary ? topCompanySummary.count + ' conversations captured with this company name.' : 'Most sessions do not include a company name yet.';
    setCount(totalSessions + ' conversations analyzed');
    renderCharts(sessions);
  }

  async function loadAnalytics() {
    var cfg = readConfig();
    var token = accessToken.value.trim();

    if (!cfg.reportingApiUrl) {
      setStatus('Missing reportingApiUrl in docs/config.js.');
      return;
    }

    if (!token) {
      setStatus('Access token required.');
      return;
    }

    storeToken(token);

    var requestUrl = new URL(cfg.reportingApiUrl);
    if (cfg.reportingLimit > 0) {
      requestUrl.searchParams.set('limit', String(Math.floor(cfg.reportingLimit)));
    }

    setStatus('Loading analytics...');

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

      var rows = Array.isArray(payload.rows) ? payload.rows : [];
      renderAnalytics(rows);
      setStatus('Analytics loaded from secure reporting data.');
    } catch (error) {
      setStatus('Unable to load analytics.');
      setCount('0 conversations analyzed');
      destroyCharts();
      console.error('Analytics dashboard error:', error);
    }
  }

  accessToken.value = getStoredToken();
  accessToken.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadAnalytics();
    }
  });

  refreshBtn.addEventListener('click', loadAnalytics);
  trendPresetFilter.addEventListener('change', function () {
    updateTrendCustomDateRangeState();
    scheduleAnalyticsRefresh();
  });
  trendDateStartFilter.addEventListener('change', scheduleAnalyticsRefresh);
  trendDateEndFilter.addEventListener('change', scheduleAnalyticsRefresh);

  setStatus('Enter your dashboard access token to load analytics.');
  setCount('0 conversations analyzed');
  updateTrendCustomDateRangeState();

  if (accessToken.value.trim()) {
    loadAnalytics();
  }
  // Theme toggle
  var themeToggle = document.getElementById('themeToggle');
  var THEME_KEY = 'tangerine_theme';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.textContent = 'Light Mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = 'Dark Mode';
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
