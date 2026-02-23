(function () {
	const widgetRoot = document.querySelector('.chat-widget');
	const toggleButton = document.getElementById('chatToggle');
	const panel = document.getElementById('chatPanel');
	const form = document.getElementById('chatForm');
	const input = document.getElementById('chatInput');
	const messages = document.getElementById('chatMessages');
	const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const webhookUrl = widgetRoot?.dataset?.n8nWebhook || '';

	if (!toggleButton || !panel || !form || !input || !messages) {
		return;
	}

	const responses = [
		{
			match: /hello|hi|hey/i,
			reply: 'Hey there! How can I help you today?'
		},
		{
			match: /who|what.*you/i,
			reply: 'I am a simple local demo chatbot widget running in this page.'
		},
		{
			match: /help|support/i,
			reply: 'You can ask me basic questions about this website example.'
		},
		{
			match: /website|page/i,
			reply: 'This page is a starter homepage with a floating chat widget in the bottom-right corner.'
		}
	];

	function appendMessage(text, role) {
		const item = document.createElement('div');
		item.className = `message ${role}`;
		item.textContent = text;
		messages.appendChild(item);
		messages.scrollTop = messages.scrollHeight;
	}

	function getBotReply(userText) {
		const matched = responses.find((entry) => entry.match.test(userText));
		if (matched) {
			return matched.reply;
		}

		return "Thanks for your message. I'm a simple demo bot, so my replies are intentionally basic.";
	}

	function extractReply(payload) {
		if (!payload) {
			return null;
		}

		if (typeof payload === 'string') {
			return payload;
		}

		if (Array.isArray(payload) && payload.length > 0) {
			return extractReply(payload[0]);
		}

		if (typeof payload === 'object') {
			return payload.reply || payload.message || payload.output || payload.text || null;
		}

		return null;
	}

	async function getN8nReply(userText) {
		if (!webhookUrl) {
			return null;
		}

		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				message: userText,
				sessionId,
				source: 'website-widget',
				timestamp: new Date().toISOString()
			})
		});

		if (!response.ok) {
			throw new Error(`Webhook request failed (${response.status})`);
		}

		const contentType = response.headers.get('content-type') || '';
		if (!contentType.includes('application/json')) {
			const plainText = await response.text();
			return plainText || null;
		}

		const data = await response.json();
		return extractReply(data);
	}

	toggleButton.addEventListener('click', function () {
		const isOpen = !panel.hasAttribute('hidden');
		if (isOpen) {
			panel.setAttribute('hidden', '');
			toggleButton.setAttribute('aria-expanded', 'false');
			return;
		}

		panel.removeAttribute('hidden');
		toggleButton.setAttribute('aria-expanded', 'true');
		input.focus();
	});

	form.addEventListener('submit', async function (event) {
		event.preventDefault();
		const userText = input.value.trim();
		if (!userText) {
			return;
		}

		appendMessage(userText, 'user');
		input.value = '';

		appendMessage('...', 'bot');
		const typingMessage = messages.lastElementChild;

		try {
			const n8nReply = await getN8nReply(userText);
			const replyText = n8nReply || getBotReply(userText);
			if (typingMessage) {
				typingMessage.textContent = replyText;
			}
		} catch (_error) {
			if (typingMessage) {
				typingMessage.textContent = 'There was a connection issue. Using local fallback response.';
			}
			window.setTimeout(function () {
				appendMessage(getBotReply(userText), 'bot');
			}, 150);
		}
	});
})();
