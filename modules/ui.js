export function initTheme() {
  const savedTheme = localStorage.getItem('chat_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const toggle = document.getElementById('themeToggleBtn');
  const label = document.getElementById('themeLabel');
  if (toggle && label) { toggle.checked = savedTheme === 'dark'; label.textContent = 'Темная тема'; }
}
export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('chat_theme', newTheme);
  const label = document.getElementById('themeLabel'); if (label) label.textContent = 'Темная тема';
}

function appendTextWithLinks(container, text) {
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  let last = 0; let match;
  while ((match = urlPattern.exec(text)) !== null) {
    container.appendChild(document.createTextNode(text.slice(last, match.index)));
    let raw = match[0]; let trailing = '';
    while (/[),.!?;:]$/.test(raw)) { trailing = raw.slice(-1) + trailing; raw = raw.slice(0, -1); }
    const link = document.createElement('a');
    link.href = raw.startsWith('www.') ? `https://${raw}` : raw;
    link.textContent = raw; link.target = '_blank'; link.rel = 'noopener noreferrer';
    container.appendChild(link); if (trailing) container.appendChild(document.createTextNode(trailing));
    last = match.index + match[0].length;
  }
  container.appendChild(document.createTextNode(text.slice(last)));
}

export function displayMessage(name, text, imageBase64, currentUser, isRead, messageId, timestamp, replyTo = null, prepend = false) {
  const messagesDiv = document.getElementById('messages');
  const wasNearBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < 100;
  const messageEl = document.createElement('div'); messageEl.classList.add('message'); messageEl.dataset.id = messageId;
  const isMine = name === currentUser; if (isMine) messageEl.classList.add('my-message');
  if (isMine) {
    const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.textContent = 'удалить';
    const confirmBox = document.createElement('div'); confirmBox.className = 'delete-confirm-box hidden';
    confirmBox.innerHTML = '<span>Удалить?</span><button class="confirm-yes">Да</button><button class="confirm-no">Нет</button>';
    deleteBtn.onclick = e => { e.stopPropagation(); confirmBox.classList.toggle('hidden'); };
    confirmBox.querySelector('.confirm-yes').onclick = async e => { e.stopPropagation(); try { const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js'); const { db } = await import('./firebase.js'); await remove(ref(db, `messages/${messageId}`)); messageEl.remove(); } catch (err) { console.error('Ошибка удаления:', err); } };
    confirmBox.querySelector('.confirm-no').onclick = e => { e.stopPropagation(); confirmBox.classList.add('hidden'); };
    messageEl.append(deleteBtn, confirmBox);
  }
  const senderSpan = document.createElement('span'); senderSpan.className = 'sender'; senderSpan.textContent = name; messageEl.appendChild(senderSpan);
  if (replyTo) {
    const quote = document.createElement('button'); quote.type = 'button'; quote.className = 'reply-preview';
    quote.textContent = `↪ Ответ на ${replyTo.name || 'сообщение'}: ${(replyTo.text || (replyTo.image ? '📷 Изображение' : '')).slice(0, 100)}`;
    quote.onclick = () => { const target = document.querySelector(`.message[data-id="${replyTo.id}"]`); if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.classList.add('message-highlight'); setTimeout(() => target.classList.remove('message-highlight'), 1200); } };
    messageEl.appendChild(quote);
  }
  let imgElement = null; let textSpan = null;
  if (imageBase64) { imgElement = document.createElement('img'); imgElement.src = imageBase64; imgElement.alt = text ? 'Изображение: ' + text : 'Изображение'; imgElement.onclick = async () => { const { openImageViewer } = await import('./viewer.js'); openImageViewer(imageBase64); }; messageEl.appendChild(imgElement); }
  if (text) { textSpan = document.createElement('span'); textSpan.className = 'message-text'; appendTextWithLinks(textSpan, text); if (imageBase64) { textSpan.style.display = 'block'; textSpan.style.marginTop = '8px'; } messageEl.appendChild(textSpan); }
  const replyBtn = document.createElement('button'); replyBtn.type = 'button'; replyBtn.className = 'reply-btn'; replyBtn.textContent = 'ответить';
  replyBtn.onclick = () => { document.dispatchEvent(new CustomEvent('chat:reply', { detail: { id: messageId, name, text, image: !!imageBase64 } })); };
  messageEl.appendChild(replyBtn);
  const metaDiv = document.createElement('div'); metaDiv.className = 'message-meta';
  if (timestamp) { const timeSpan = document.createElement('span'); timeSpan.className = 'msg-time'; timeSpan.dataset.timestamp = timestamp; const date = new Date(timestamp); const use24 = localStorage.getItem('chat_time_format') !== '12'; timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24 }); metaDiv.appendChild(timeSpan); }
  if (isMine) { const statusSpan = document.createElement('span'); statusSpan.className = 'msg-status'; statusSpan.textContent = isRead ? 'Прочитано' : 'Отправлено'; metaDiv.appendChild(statusSpan); }
  messageEl.appendChild(metaDiv);
  if (prepend) messagesDiv.insertBefore(messageEl, messagesDiv.firstChild); else messagesDiv.appendChild(messageEl);
  if (!prepend && wasNearBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  if (imgElement) imgElement.onload = () => { const width = imgElement.offsetWidth; if (textSpan) textSpan.style.maxWidth = width + 'px'; metaDiv.style.maxWidth = width + 'px'; metaDiv.style.width = width + 'px'; messageEl.style.width = 'fit-content'; messageEl.style.maxWidth = '100%'; };
}
export function updateMessageStatus(messageId, isRead) { const el = document.querySelector(`.message[data-id="${messageId}"]`); if (el && isRead) { const status = el.querySelector('.msg-status'); if (status) status.textContent = 'Прочитано'; } }
export function refreshMessageTimes() { document.querySelectorAll('.message').forEach(el => { const id = el.dataset.id; const time = el.querySelector('.msg-time'); if (!time || !time.dataset.timestamp) return; const date = new Date(Number(time.dataset.timestamp)); time.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: localStorage.getItem('chat_time_format') === '12' }); }); }
