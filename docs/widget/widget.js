(function () {
	/* ── DOM references ────────────────────────────────── */
	const widgetRoot = document.querySelector('.chat-widget');
	const toggleButton = document.getElementById('chatToggle');
	const panel = document.getElementById('chatPanel');
	const form = document.getElementById('chatForm');
	const input = document.getElementById('chatInput');
	const messages = document.getElementById('chatMessages');
	const tooltip = document.getElementById('chatTooltip');
	const tooltipClose = document.getElementById('chatTooltipClose');
	const btnNewConversation = document.getElementById('btnNewConversation');
	const btnPastConversations = document.getElementById('btnPastConversations');
	const conversationsList = document.getElementById('chatConversations');
	const faqContainer = document.getElementById('chatFaq');
	const faqTrack = document.getElementById('chatFaqTrack');
	const webhookUrl = window.TANGERINE_CONFIG?.n8nWebhookUrl || 'https://n8n.srv971592.hstgr.cloud/webhook/tangerine-test';

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

	const WELCOME_MESSAGE = "Hi! I'm the Tangerine assistant. Ask me anything about Tangerine Search.";
	const TOGGLE_PULSE_CLASS = 'chat-toggle-pulse';
	let togglePulseStopped = false;

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
		return escaped.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
			var clean = url.replace(/[.,;:!?)]+$/, '');
			var trailing = url.slice(clean.length);
			return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + trailing;
		});
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

	/* ── Tooltip ───────────────────────────────────────── */
	var tooltipDismissed = false;

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
		window.setTimeout(showTooltip, 2000);
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
		input.focus();
	});

	/* ── New conversation ──────────────────────────────── */
	if (btnNewConversation) {
		btnNewConversation.addEventListener('click', function () {
			if (currentMessages.length > 0) {
				ConversationStore.save(currentSessionId, currentMessages);
			}

			currentSessionId = generateSessionId();
			currentMessages = [];

			messages.innerHTML = '';
			var welcome = document.createElement('div');
			welcome.className = 'message bot';
			welcome.textContent = WELCOME_MESSAGE;
			messages.appendChild(welcome);

			switchToView('chat');
			input.focus();
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
		input.value = question;
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	}

	function showFaq() {
		if (faqContainer) faqContainer.removeAttribute('hidden');
	}

	function hideFaq() {
		if (faqContainer) faqContainer.setAttribute('hidden', '');
	}

	buildFaqCarousel();

	/* ── Form submit ───────────────────────────────────── */
	form.addEventListener('submit', async function (event) {
		event.preventDefault();
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