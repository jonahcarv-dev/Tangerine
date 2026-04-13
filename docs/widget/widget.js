(function () {
	/* ── DOM references ────────────────────────────────── */
	const widgetRoot = document.querySelector('.chat-widget');
	const toggleButton = document.getElementById('chatToggle');
	const panel = document.getElementById('chatPanel');
	const form = document.getElementById('chatForm');
	const input = document.getElementById('chatInput');
	const sendButton = form ? form.querySelector('button[type="submit"], button') : null;
	const messages = document.getElementById('chatMessages');
	const tooltip = document.getElementById('chatTooltip');
	const tooltipClose = document.getElementById('chatTooltipClose');
	const btnNewConversation = document.getElementById('btnNewConversation');
	const btnPastConversations = document.getElementById('btnPastConversations');
	const conversationsList = document.getElementById('chatConversations');
	const faqContainer = document.getElementById('chatFaq');
	const faqTrack = document.getElementById('chatFaqTrack');
	const webhookUrl = (window.TANGERINE_CONFIG && window.TANGERINE_CONFIG.n8nWebhookUrl)
		? String(window.TANGERINE_CONFIG.n8nWebhookUrl).trim()
		: '';

	if (!webhookUrl) {
		console.warn('Tangerine widget: n8nWebhookUrl is missing in config.js. Falling back to local reply mode.');
	}

	if (!toggleButton || !panel || !form || !input || !messages) {
		return;
	}

	/* ── Session state ─────────────────────────────────── */
	let currentSessionId = generateSessionId();
	let currentMessages = [];
	let currentView = 'chat';
	const toggleIconHtml = toggleButton.innerHTML;

	const CLOSE_ICON_SVG =
		'<svg viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2" aria-hidden="true">' +
		'<line x1="4" y1="4" x2="12" y2="12"/>' +
		'<line x1="12" y1="4" x2="4" y2="12"/></svg>';

	const WELCOME_MESSAGE = "Are you searching on behalf of a business or for yourself?";
	const DEFAULT_BOT_GREETING = "Hi! I'm the Tangerine assistant. Ask me anything about Tangerine Search.";
	const BUSINESS_BOT_GREETING = "Thanks! I'm the Tangerine assistant. Ask me anything about Tangerine Search.";
	const ENTRY_PROMPT_OPTIONS = [
		{ value: 'business', label: 'Business' },
		{ value: 'self', label: 'Myself' }
	];
	const TOGGLE_PULSE_CLASS = 'chat-toggle-pulse';
	let togglePulseStopped = false;
	let introPromptShown = false;
	let businessNamePending = false;
	let sessionUserType = null;
	let sessionCompanyName = null;
	const INPUT_PLACEHOLDER_DEFAULT = 'Type a message...';
	const INPUT_PLACEHOLDER_ONBOARDING = 'Choose Business or Myself to start';
	const INPUT_PLACEHOLDER_BUSINESS_PENDING = 'Enter business name and click Continue';

	function isOnboardingComplete() {
		if (sessionUserType === 'self') return true;
		if (sessionUserType === 'business' && !!sessionCompanyName) return true;
		return false;
	}

	function generateSessionId() {
		return 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
	}

	/* ── Conversation store (localStorage) ─────────────── */
	const STORAGE_KEY = 'tangerine_chat_conversations';

	const ConversationStore = {
		_getAll: function () {
			try {
				return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
			} catch (_e) {
				return {};
			}
		},

		_saveAll: function (conversations) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
			} catch (_e) {
				/* localStorage full or unavailable */
			}
		},

		save: function (sessionId, messagesArray) {
			if (!sessionId || !messagesArray || messagesArray.length === 0) return;
			var conversations = this._getAll();
			var lastUserMsg = null;
			for (var i = messagesArray.length - 1; i >= 0; i--) {
				if (messagesArray[i].role === 'user') {
					lastUserMsg = messagesArray[i].text;
					break;
				}
			}
			conversations[sessionId] = {
				messages: messagesArray,
				updatedAt: new Date().toISOString(),
				preview: lastUserMsg || 'New conversation'
			};
			this._saveAll(conversations);
		},

		load: function (sessionId) {
			var conversations = this._getAll();
			return conversations[sessionId] || null;
		},

		list: function () {
			var conversations = this._getAll();
			return Object.keys(conversations)
				.map(function (id) {
					return {
						sessionId: id,
						updatedAt: conversations[id].updatedAt,
						preview: conversations[id].preview,
						messageCount: conversations[id].messages.length
					};
				})
				.sort(function (a, b) {
					return new Date(b.updatedAt) - new Date(a.updatedAt);
				});
		}
	};

	/* ── Local fallback responses ──────────────────────── */
	const responses = [
		{ match: /hello|hi|hey/i, reply: 'Hey there! How can I help you today?' },
		{ match: /who|what.*you/i, reply: 'I am the Tangerine Search assistant, here to answer your questions.' },
		{ match: /help|support/i, reply: 'You can ask me about Tangerine Search services, employers, or job seekers.' },
		{ match: /website|page/i, reply: 'This is the Tangerine Search website with a floating chat assistant.' }
	];

	/* ── Message helpers ───────────────────────────────── */
	function linkify(text) {
		var escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		// Markdown links: [text](url)
		escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_m, linkText, url) {
			return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>';
		});
		// Bold: **text**
		escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		// Bare URLs not already inside an <a> tag
		escaped = escaped.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, function (_m, prefix, url) {
			var clean = url.replace(/[.,;:!?)]+$/, '');
			var trailing = url.slice(clean.length);
			return prefix + '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + trailing;
		});
		// Line breaks
		escaped = escaped.replace(/\n/g, '<br>');
		return escaped;
	}

	function appendMessage(text, role) {
		var item = document.createElement('div');
		item.className = 'message ' + role;
		if (role === 'bot') {
			item.innerHTML = linkify(text);
		} else {
			item.textContent = text;
		}
		messages.appendChild(item);
		messages.scrollTop = messages.scrollHeight;

		if (text !== '...') {
			currentMessages.push({ role: role, text: text });
			ConversationStore.save(currentSessionId, currentMessages);
		}
	}

	function setChatInputEnabled(enabled) {
		input.disabled = !enabled;
		if (sendButton) sendButton.disabled = !enabled;
		if (enabled) {
			input.placeholder = INPUT_PLACEHOLDER_DEFAULT;
		} else {
			input.placeholder = businessNamePending
				? INPUT_PLACEHOLDER_BUSINESS_PENDING
				: INPUT_PLACEHOLDER_ONBOARDING;
		}
	}

	function showBusinessNamePrompt() {
		if (businessNamePending) return;
		businessNamePending = true;
		setChatInputEnabled(false);
		hideFaq();
		appendMessage('Please enter your business name to continue.', 'bot');

		var entry = document.createElement('div');
		entry.className = 'message-intro-business-entry';

		var businessInput = document.createElement('input');
		businessInput.type = 'text';
		businessInput.placeholder = 'Business name';
		businessInput.autocomplete = 'organization';

		var continueBtn = document.createElement('button');
		continueBtn.type = 'button';
		continueBtn.textContent = 'Continue';

		function submitBusinessName() {
			var businessName = businessInput.value.trim();
			if (!businessName) {
				businessInput.focus();
				return;
			}

			appendMessage(businessName, 'user');
			entry.remove();
			appendMessage(BUSINESS_BOT_GREETING, 'bot');
			businessNamePending = false;
			sessionUserType = 'business';
			sessionCompanyName = businessName;
			saveSessionMetadata('business', businessName);
			setChatInputEnabled(true);
			showFaq();
			input.focus();
		}

		continueBtn.addEventListener('click', submitBusinessName);
		businessInput.addEventListener('keydown', function (event) {
			if (event.key === 'Enter') {
				event.preventDefault();
				submitBusinessName();
			}
		});

		entry.appendChild(businessInput);
		entry.appendChild(continueBtn);
		messages.appendChild(entry);
		messages.scrollTop = messages.scrollHeight;
		businessInput.focus();
	}

	function addEntryPromptMessage() {
		var prompt = document.createElement('div');
		prompt.className = 'message bot message-intro';
		prompt.textContent = WELCOME_MESSAGE;

		var options = document.createElement('div');
		options.className = 'message-intro-options';

		ENTRY_PROMPT_OPTIONS.forEach(function (option, index) {
			var button = document.createElement('button');
			button.type = 'button';
			button.className = 'message-intro-option';
			button.setAttribute('aria-label', index === 0 ? 'Business option' : 'Self option');
			button.dataset.value = option.value;
			button.textContent = option.label;
			button.addEventListener('click', function () {
				options.setAttribute('data-selected', option.value);
				if (option.value === 'business') {
					if (options.getAttribute('data-flow-complete') === '1') return;
					options.setAttribute('data-flow-complete', '1');

					var optionButtons = options.querySelectorAll('.message-intro-option');
					optionButtons.forEach(function (btn) {
						if (btn.dataset.value !== 'business') {
							btn.remove();
						}
					});

					showBusinessNamePrompt();
					return;
				}

				if (option.value === 'self') {
					if (options.getAttribute('data-flow-complete') === '1') return;
					options.setAttribute('data-flow-complete', '1');

					var allButtons = options.querySelectorAll('.message-intro-option');
					allButtons.forEach(function (btn) {
						if (btn.dataset.value !== 'self') {
							btn.remove();
						}
					});

					appendMessage(DEFAULT_BOT_GREETING, 'bot');
					sessionUserType = 'self';
					sessionCompanyName = null;
					saveSessionMetadata('self', null);
					setChatInputEnabled(true);
					showFaq();
					input.focus();
				}
			});
			options.appendChild(button);
		});

		messages.appendChild(prompt);
		messages.appendChild(options);
		messages.scrollTop = messages.scrollHeight;
		introPromptShown = true;
	}

	function ensureIntroPrompt() {
		if (introPromptShown || currentMessages.length > 0) return;
		setChatInputEnabled(false);
		hideFaq();
		messages.innerHTML = '';
		addEntryPromptMessage();
	}

	function getBotReply(userText) {
		var matched = responses.find(function (entry) { return entry.match.test(userText); });
		return matched ? matched.reply : "Thanks for your message. I'm the Tangerine assistant — my replies are limited in demo mode.";
	}

	function extractReply(payload) {
		if (!payload) return null;
		if (typeof payload === 'string') return payload;
		if (Array.isArray(payload) && payload.length > 0) return extractReply(payload[0]);
		if (typeof payload === 'object') {
			return payload.reply || payload.message || payload.output || payload.text || null;
		}
		return null;
	}

	async function getN8nReply(userText) {
		if (!webhookUrl) return null;

		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chatInput: userText,
				sessionId: currentSessionId,
				source: 'website-widget',
				timestamp: new Date().toISOString()
			})
		});

		if (!response.ok) throw new Error('Webhook request failed (' + response.status + ')');

		const contentType = response.headers.get('content-type') || '';
		if (!contentType.includes('application/json')) {
			var plainText = await response.text();
			return plainText || null;
		}

		var data = await response.json();
		return extractReply(data);
	}

	/* ── Session metadata persistence ─────────────────── */
	function saveSessionMetadata(userType, companyName) {
		var cfg = window.TANGERINE_CONFIG || {};
		var url = cfg.supabaseUrl;
		var key = cfg.supabaseAnonKey;
		if (!url || !key) return;
		fetch(url + '/functions/v1/save-session-metadata', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + key
			},
			body: JSON.stringify({
				sessionId: currentSessionId,
				userType: userType,
				companyName: companyName || null
			})
		}).catch(function (err) {
			console.warn('Tangerine widget: failed to save session metadata', err);
		});
	}

	/* ── Tooltip ───────────────────────────────────────── */
	var tooltipDismissed = false;

	/* ── Page-specific opener message ─────────────────── */
	(function setPageTooltip() {
		if (!tooltip) return;
		var cfg = window.TANGERINE_CONFIG || {};
		// Allow host page to override via config
		if (cfg.tooltipMessage) {
			tooltip.firstChild.textContent = cfg.tooltipMessage;
			return;
		}
		var path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
		var msg;
		if (path === '' || path === '/') {
			msg = 'Need to hire fast? We present vetted talent in 2\u20133 days.';
		} else if (/\/employers$/.test(path) || /\/scalable-hr$/.test(path)) {
			msg = 'Not sure which service fits your situation? I can help you figure it out.';
		} else if (/\/insights$/.test(path)) {
			// Insights: inject a clickable newsletter link
			var closeBtn = tooltip.querySelector('#chatTooltipClose');
			tooltip.innerHTML = '';
			tooltip.appendChild(document.createTextNode('Enjoying the content? '));
			var link = document.createElement('a');
			link.href = 'https://www.tangerinesearch.net/the-squeeze-signup';
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.textContent = 'Sign\u00A0up for The\u00A0Squeeze';
			tooltip.appendChild(link);
			tooltip.appendChild(document.createTextNode(', our newsletter \u2014 or ask me about a hiring challenge! '));
			if (closeBtn) tooltip.appendChild(closeBtn);
			return;
		} else if (/\/contact$/.test(path)) {
			msg = 'Looking to get in touch? I can answer questions right now or help you book a call.';
		} else {
			msg = 'Need to hire fast? Let\u2019s see if Tangerine is a fit.';
		}
		// Replace the text node inside the tooltip (preserve the close button)
		var firstText = tooltip.firstChild;
		if (firstText && firstText.nodeType === 3) {
			firstText.textContent = msg + ' ';
		}
	})();

	function showTooltip() {
		if (tooltipDismissed || !tooltip) return;
		if (panel && !panel.hasAttribute('hidden')) return;
		tooltip.removeAttribute('hidden');
	}

	function hideTooltip() {
		if (tooltip) tooltip.setAttribute('hidden', '');
		tooltipDismissed = true;
		try { sessionStorage.setItem('tangerine_tooltip_dismissed', '1'); } catch (_e) {}
	}

	if (!sessionStorage.getItem('tangerine_tooltip_dismissed')) {
		window.setTimeout(showTooltip, 800);
	} else {
		tooltipDismissed = true;
	}

	if (tooltipClose) {
		tooltipClose.addEventListener('click', function (e) {
			e.stopPropagation();
			hideTooltip();
		});
	}

	function stopTogglePulse() {
		if (togglePulseStopped) return;
		togglePulseStopped = true;
		toggleButton.classList.remove(TOGGLE_PULSE_CLASS);
		toggleButton.removeEventListener('animationend', onTogglePulseAnimationEnd);
		toggleButton.removeEventListener('pointerdown', stopTogglePulse);
		toggleButton.removeEventListener('keydown', stopTogglePulse);
		toggleButton.removeEventListener('touchstart', stopTogglePulse);
	}

	function onTogglePulseAnimationEnd(event) {
		if (event.animationName !== 'chatTogglePulse') return;
		stopTogglePulse();
	}

	function startTogglePulse() {
		toggleButton.classList.add(TOGGLE_PULSE_CLASS);
		toggleButton.addEventListener('animationend', onTogglePulseAnimationEnd);
		toggleButton.addEventListener('pointerdown', stopTogglePulse);
		toggleButton.addEventListener('keydown', stopTogglePulse);
		toggleButton.addEventListener('touchstart', stopTogglePulse);
	}

	startTogglePulse();

	/* ── View switching ────────────────────────────────── */
	function switchToView(view) {
		currentView = view;
		if (view === 'chat') {
			messages.removeAttribute('hidden');
			form.removeAttribute('hidden');
			showFaq();
			if (conversationsList) conversationsList.setAttribute('hidden', '');
		} else if (view === 'conversations') {
			messages.setAttribute('hidden', '');
			form.setAttribute('hidden', '');
			hideFaq();
			if (conversationsList) {
				conversationsList.removeAttribute('hidden');
				renderConversationsList();
			}
		}
	}

	/* ── Conversations list ────────────────────────────── */
	function formatDate(isoString) {
		var d = new Date(isoString);
		var now = new Date();
		var diff = now - d;
		var timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		if (diff < 86400000) return 'Today at ' + timeStr;
		if (diff < 172800000) return 'Yesterday at ' + timeStr;
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + timeStr;
	}

	function renderConversationsList() {
		if (!conversationsList) return;
		conversationsList.innerHTML = '';

		var backBtn = document.createElement('button');
		backBtn.className = 'chat-back-btn';
		backBtn.innerHTML = '&larr; Back to chat';
		backBtn.addEventListener('click', function () { switchToView('chat'); });
		conversationsList.appendChild(backBtn);

		var convos = ConversationStore.list();

		if (convos.length === 0) {
			var empty = document.createElement('div');
			empty.className = 'chat-conversations-empty';
			empty.textContent = 'No past conversations yet.';
			conversationsList.appendChild(empty);
			return;
		}

		convos.forEach(function (convo) {
			var item = document.createElement('div');
			item.className = 'chat-conversation-item';
			if (convo.sessionId === currentSessionId) {
				item.className += ' chat-conversation-item-active';
			}

			var dateEl = document.createElement('div');
			dateEl.className = 'chat-conversation-item-date';
			dateEl.textContent = formatDate(convo.updatedAt);

			var previewEl = document.createElement('div');
			previewEl.className = 'chat-conversation-item-preview';
			previewEl.textContent = convo.preview;

			item.appendChild(dateEl);
			item.appendChild(previewEl);

			item.addEventListener('click', function () { loadConversation(convo.sessionId); });
			conversationsList.appendChild(item);
		});
	}

	function loadConversation(sessionId) {
		var convo = ConversationStore.load(sessionId);
		if (!convo) return;

		if (currentMessages.length > 0) {
			ConversationStore.save(currentSessionId, currentMessages);
		}

		currentSessionId = sessionId;
		currentMessages = convo.messages.slice();

		messages.innerHTML = '';
		convo.messages.forEach(function (msg) {
			var item = document.createElement('div');
			item.className = 'message ' + msg.role;
			if (msg.role === 'bot') {
				item.innerHTML = linkify(msg.text);
			} else {
				item.textContent = msg.text;
			}
			messages.appendChild(item);
		});
		messages.scrollTop = messages.scrollHeight;
		businessNamePending = false;
		if (!isOnboardingComplete() && convo.messages.length > 0) {
			sessionUserType = 'self';
			sessionCompanyName = null;
		}
		setChatInputEnabled(isOnboardingComplete());

		switchToView('chat');
	}

	/* ── Toggle open/close ─────────────────────────────── */
	toggleButton.addEventListener('click', function () {
		stopTogglePulse();
		var isOpen = !panel.hasAttribute('hidden');
		if (isOpen) {
			panel.setAttribute('hidden', '');
			toggleButton.setAttribute('aria-expanded', 'false');
			toggleButton.innerHTML = toggleIconHtml;
			toggleButton.setAttribute('aria-label', 'Open Tangerine chat');
			return;
		}

		panel.removeAttribute('hidden');
		toggleButton.setAttribute('aria-expanded', 'true');
		toggleButton.innerHTML = CLOSE_ICON_SVG;
		toggleButton.setAttribute('aria-label', 'Close chat');
		hideTooltip();
		switchToView('chat');
		ensureIntroPrompt();
		if (!input.disabled) input.focus();
	});

	/* ── New conversation ──────────────────────────────── */
	if (btnNewConversation) {
		btnNewConversation.addEventListener('click', function () {
			if (currentMessages.length > 0) {
				ConversationStore.save(currentSessionId, currentMessages);
			}

			currentSessionId = generateSessionId();
			currentMessages = [];
			businessNamePending = false;
			sessionUserType = null;
			sessionCompanyName = null;
			setChatInputEnabled(false);
			hideFaq();

			messages.innerHTML = '';
			introPromptShown = false;
			ensureIntroPrompt();

			switchToView('chat');
			if (!input.disabled) input.focus();
		});
	}

	/* ── Past conversations toggle ─────────────────────── */
	if (btnPastConversations) {
		btnPastConversations.addEventListener('click', function () {
			if (currentView === 'conversations') {
				switchToView('chat');
			} else {
				switchToView('conversations');
			}
		});
	}

	/* ── FAQ Carousel ──────────────────────────────────── */
	const FAQ_QUESTIONS = [
		'What does Tangerine Search do?',
		'How can Tangerine help employers?',
		'What industries does Tangerine specialize in?',
		'How do I book a discovery call?',
		'What makes Tangerine different from other recruiters?',
		'Does Tangerine help with diversity hiring?'
	];

	function buildFaqCarousel() {
		if (!faqTrack) return;
		faqTrack.innerHTML = '';
		// Duplicate the list so the scroll loops seamlessly
		var allItems = FAQ_QUESTIONS.concat(FAQ_QUESTIONS);
		allItems.forEach(function (q) {
			var chip = document.createElement('button');
			chip.className = 'chat-faq-item';
			chip.type = 'button';
			chip.textContent = q;
			chip.addEventListener('click', function () { sendFaqQuestion(q); });
			faqTrack.appendChild(chip);
		});
	}

	function sendFaqQuestion(question) {
		if (!isOnboardingComplete() || input.disabled || businessNamePending) return;
		input.value = question;
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	}

	function showFaq() {
		if (!faqContainer) return;
		if (isOnboardingComplete()) {
			faqContainer.removeAttribute('hidden');
		} else {
			faqContainer.setAttribute('hidden', '');
		}
	}

	function hideFaq() {
		if (faqContainer) faqContainer.setAttribute('hidden', '');
	}

	buildFaqCarousel();
	hideFaq();
	setChatInputEnabled(false);

	/* ── Form submit ───────────────────────────────────── */
	form.addEventListener('submit', async function (event) {
		event.preventDefault();
		if (!isOnboardingComplete() || input.disabled || businessNamePending) return;
		var userText = input.value.trim();
		if (!userText) return;

		appendMessage(userText, 'user');
		input.value = '';

		var typingMessage = document.createElement('div');
		typingMessage.className = 'message bot typing';
		typingMessage.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
		messages.appendChild(typingMessage);
		messages.scrollTop = messages.scrollHeight;

		try {
			var n8nReply = await getN8nReply(userText);
			var replyText = n8nReply || getBotReply(userText);
			if (typingMessage) {
				typingMessage.classList.remove('typing');
				typingMessage.innerHTML = linkify(replyText);
				currentMessages.push({ role: 'bot', text: replyText });
				ConversationStore.save(currentSessionId, currentMessages);
			}
		} catch (_error) {
			if (typingMessage) {
				typingMessage.classList.remove('typing');
				typingMessage.textContent = 'There was a connection issue. Using local fallback response.';
				currentMessages.push({ role: 'bot', text: typingMessage.textContent });
				ConversationStore.save(currentSessionId, currentMessages);
			}
			window.setTimeout(function () {
				appendMessage(getBotReply(userText), 'bot');
			}, 150);
		}
	});

	/* ── Mobile keyboard handling ──────────────────────── */
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', function () {
			if (!panel.hasAttribute('hidden')) {
				var vvh = window.visualViewport.height;
				var keyboardOpen = window.innerHeight - vvh > 100;
				if (keyboardOpen) {
					widgetRoot.style.height = vvh + 'px';
					widgetRoot.style.top = window.visualViewport.offsetTop + 'px';
					widgetRoot.style.bottom = 'auto';
					messages.scrollTop = messages.scrollHeight;
				} else {
					widgetRoot.style.height = '';
					widgetRoot.style.top = '';
					widgetRoot.style.bottom = '';
				}
			}
		});
	}
})();