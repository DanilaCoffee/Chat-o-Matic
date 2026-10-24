// Управление темой
// Управление темой
export function initTheme() {
  const savedTheme = localStorage.getItem('chat_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Синхронизируем состояние переключателя и текста при загрузке
  const toggle = document.getElementById('themeToggleBtn');
  const label = document.getElementById('themeLabel');
  if (toggle && label) {
    toggle.checked = (savedTheme === 'dark');
    label.textContent = toggle.checked ? 'Темная тема' : 'Темная тема';
  }
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('chat_theme', newTheme);

  // Меняем текст
  const label = document.getElementById('themeLabel');
  if (label) {
    label.textContent = newTheme === 'dark' ? 'Темная тема' : 'Темная тема';
  }
}
// Отрисовка сообщения
export function displayMessage(name, text, imageBase64, currentUser, isRead, messageId, timestamp) {
  const messagesDiv = document.getElementById('messages');
  const messageEl = document.createElement('div');
  messageEl.classList.add('message');
  messageEl.dataset.id = messageId;
  
  const isMine = (name === currentUser);
  if (isMine) {
    messageEl.classList.add('my-message');
  }

  const senderSpan = document.createElement('span');
  senderSpan.className = 'sender';
  senderSpan.textContent = name;
  messageEl.appendChild(senderSpan);

  if (imageBase64) {
    const img = document.createElement('img');
    img.src = imageBase64;
    img.onclick = async () => {
      const { openImageViewer } = await import('./viewer.js');
      openImageViewer(imageBase64);
    };
    messageEl.appendChild(img);
  } else {
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    messageEl.appendChild(textSpan);
  }

  // === БЛОК С ВРЕМЕНЕМ И СТАТУСОМ ===
  const metaDiv = document.createElement('div');
  metaDiv.className = 'message-meta'; // Новый класс для гибкой настройки

  // Если время есть, форматируем его в "HH:MM"
  if (timestamp) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    const date = new Date(timestamp);
    timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    metaDiv.appendChild(timeSpan);
  }

  // Добавляем статус "Прочитано" для СВОИХ сообщений
  if (isMine) {
    const statusSpan = document.createElement('span');
    statusSpan.className = 'msg-status';
    statusSpan.textContent = isRead ? "Прочитано" : "Отправлено";
    metaDiv.appendChild(statusSpan);
  }

  // Добавляем блок с метаданными в сообщение
  messageEl.appendChild(metaDiv);
  
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Функция для обновления статуса уже отрисованного сообщения
export function updateMessageStatus(messageId, isRead) {
  const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
  if (messageEl && isRead) {
    const statusSpan = messageEl.querySelector('.msg-status');
    if (statusSpan) statusSpan.textContent = "Прочитано";
  }
}