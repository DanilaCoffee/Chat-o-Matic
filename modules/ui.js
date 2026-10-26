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

  // --- КНОПКА УДАЛЕНИЯ (только для своих) ---
  if (isMine) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'удалить';
    
    // Окно подтверждения
    const confirmBox = document.createElement('div');
    confirmBox.className = 'delete-confirm-box hidden';
    confirmBox.innerHTML = `
      <span>Удалить?</span>
      <button class="confirm-yes">Да</button>
      <button class="confirm-no">Нет</button>
    `;

    // Показываем/скрываем окно подтверждения
    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // Чтобы не срабатывали другие клики
      confirmBox.classList.toggle('hidden');
    };

    // Кнопка "Да" (удаляем)
    confirmBox.querySelector('.confirm-yes').onclick = async (e) => {
      e.stopPropagation();
      try {
        const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js");
        const { db } = await import('./firebase.js');
        await remove(ref(db, `messages/${messageId}`));
        // Сообщение исчезнет из DOM автоматически через onChildRemoved (нужно добавить в chat.js) 
        // или мы можем удалить его вручную прямо здесь:
        messageEl.remove(); 
      } catch (err) {
        console.error("Ошибка удаления:", err);
      }
    };

    // Кнопка "Нет" (скрываем)
    confirmBox.querySelector('.confirm-no').onclick = (e) => {
      e.stopPropagation();
      confirmBox.classList.add('hidden');
    };

    messageEl.appendChild(deleteBtn);
    messageEl.appendChild(confirmBox);
  }

  const senderSpan = document.createElement('span');
  senderSpan.className = 'sender';
  senderSpan.textContent = name;
  messageEl.appendChild(senderSpan);

  let imgElement = null;
  let textSpan = null;

  if (imageBase64) {
    imgElement = document.createElement('img');
    imgElement.src = imageBase64;
    imgElement.onclick = async () => {
      const { openImageViewer } = await import('./viewer.js');
      openImageViewer(imageBase64);
    };
    messageEl.appendChild(imgElement);
  }

  if (text) {
    textSpan = document.createElement('span');
    textSpan.textContent = text;
    if (imageBase64) {
      textSpan.style.display = 'block';
      textSpan.style.marginTop = '8px';
    }
    messageEl.appendChild(textSpan);
  }

  const metaDiv = document.createElement('div');
  metaDiv.className = 'message-meta';

  if (timestamp) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    const date = new Date(timestamp);
    timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    metaDiv.appendChild(timeSpan);
  }

  if (isMine) {
    const statusSpan = document.createElement('span');
    statusSpan.className = 'msg-status';
    statusSpan.textContent = isRead ? "Прочитано" : "Отправлено";
    metaDiv.appendChild(statusSpan);
  }

  messageEl.appendChild(metaDiv);
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Магия с размерами картинки
  if (imgElement) {
    imgElement.onload = () => {
      const imgWidth = imgElement.offsetWidth;
      if (textSpan) textSpan.style.maxWidth = imgWidth + 'px';
      metaDiv.style.maxWidth = imgWidth + 'px';
      metaDiv.style.width = imgWidth + 'px';
      messageEl.style.width = 'fit-content';
      messageEl.style.maxWidth = '100%';
    };
    if (imgElement.complete) imgElement.onload();
  }
}

// Функция для обновления статуса уже отрисованного сообщения
export function updateMessageStatus(messageId, isRead) {
  const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
  if (messageEl && isRead) {
    const statusSpan = messageEl.querySelector('.msg-status');
    if (statusSpan) statusSpan.textContent = "Прочитано";
  }
}