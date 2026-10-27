import { displayMessage } from './modules/ui.js';
import { initAuth, loginUser, logoutUser, currentUser } from './modules/auth.js';
import { listenForMessages, sendTextMessage, updateTextMessage } from './modules/chat.js';
import { sendImage } from './modules/images.js';
import { messagesRef } from './modules/firebase.js';
import { remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showImageModal } from './modules/modal.js';
import { startTyping, stopTyping, listenTypingStatus } from './modules/status.js';
import { initImageViewer } from './modules/viewer.js';
import { requestNotificationPermission, setNotificationVolume } from './modules/notifications.js';
import { refreshMessageTimes } from './modules/ui.js';
import { initPresence, removePresence } from './modules/presence.js';

// Элементы интерфейса
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const nameInput = document.getElementById('nameInput');
const enterBtn = document.getElementById('enterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let unsubscribeMessages = null;

function showChat() {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  messageInput.focus();

  // Запрашиваем разрешение на уведомления при входе
  requestNotificationPermission();
  initPresence();
  
  // Запускаем слушатель ТОЛЬКО когда вошли
  const user = localStorage.getItem('chat_user_name');
  if (user && !unsubscribeMessages) {
    unsubscribeMessages = listenForMessages(user);
  }
}

function showLogin() {
  clearReply();
  clearEdit();
  chatScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  logoutBtn.classList.add('hidden');
  nameInput.value = "";
  nameInput.focus();

  removePresence();
  
  // Отписываемся от слушателя при выходе
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  
  // Очищаем экран от старых сообщений (чтобы при следующем входе не было дублей)
  document.getElementById('messages').innerHTML = '';
}

let replyTarget = null;
let editingTarget = null;
let draftBeforeEdit = null;
messageInput.addEventListener('input', () => { if (!editingTarget) startTyping(); });

async function sendCurrentMessage() {
  const text = messageInput.value.trim();
  if (editingTarget) {
    if (!text && !editingTarget.image) return;
    const targetId = editingTarget.id;
    const saved = await updateTextMessage(targetId, text);
    if (saved && editingTarget?.id === targetId) {
      // Если пользователь успел начать новый текст во время запроса, сохраняем его как черновик.
      const pendingDraft = messageInput.value.trim() === text ? '' : messageInput.value;
      clearEdit({ clearInput: false });
      messageInput.value = pendingDraft;
    }
    return;
  }
  if (!text) return;

  const submittedReply = replyTarget;
<<<<<<< Updated upstream
=======
  const submittedInputValue = messageInput.value;
>>>>>>> Stashed changes
  const sent = await sendTextMessage(text, submittedReply);
  if (!sent) return; // Не теряем черновик при сетевой ошибке.

  // Не стираем новый текст, который пользователь мог начать на время отправки.
<<<<<<< Updated upstream
  if (messageInput.value.trim() === text) {
=======
  if (messageInput.value === submittedInputValue) {
>>>>>>> Stashed changes
    messageInput.value = '';
    stopTyping();
  }
  if (replyTarget === submittedReply) clearReply();
}

function clearEdit({ clearInput = true, restoreDraft = false } = {}) {
  editingTarget = null;
  document.getElementById('editingBar').classList.add('hidden');
  document.getElementById('editingText').textContent = 'Редактирование сообщения';
  if (restoreDraft && draftBeforeEdit !== null) messageInput.value = draftBeforeEdit;
  else if (clearInput) messageInput.value = '';
  draftBeforeEdit = null;
  messageInput.placeholder = 'Напиши что-нибудь...';
  sendBtn.textContent = '➤';
  const attachButton = document.getElementById('attachBtn');
  if (attachButton) attachButton.disabled = false;
}

function clearReply() {
  replyTarget = null;
  document.getElementById('replyingBar').classList.add('hidden');
  document.getElementById('replyingText').textContent = '';
}
document.addEventListener('chat:reply', (event) => {
  // Переключение на ответ не должно уничтожать набранный черновик.
  const draft = editingTarget ? draftBeforeEdit : messageInput.value;
  if (editingTarget) clearEdit({ clearInput: false, restoreDraft: true });
  else clearEdit({ clearInput: false });
  if (draft !== null) messageInput.value = draft;
  replyTarget = event.detail;
  document.getElementById('replyingText').textContent = `Ответ на ${replyTarget.name}: ${(replyTarget.text || (replyTarget.image ? '📷 Изображение' : '')).slice(0, 100)}`;
  document.getElementById('replyingBar').classList.remove('hidden');
  messageInput.focus();
});
document.getElementById('cancelReplyBtn').addEventListener('click', clearReply);
document.addEventListener('chat:edit', (event) => {
  const draft = editingTarget ? draftBeforeEdit : messageInput.value;
  if (editingTarget) clearEdit({ clearInput: false, restoreDraft: true });
  draftBeforeEdit = draft ?? '';
  clearReply();
  const target = event.detail;
  editingTarget = target;
  document.getElementById('editingText').textContent = `Редактирование сообщения: ${(target.text || (target.image ? '📷 подпись к изображению' : '')).slice(0, 90)}`;
  document.getElementById('editingBar').classList.remove('hidden');
  messageInput.value = target.text || '';
  messageInput.placeholder = 'Измени сообщение...';
  sendBtn.textContent = '✓';
  document.getElementById('attachBtn').disabled = true;
  messageInput.focus();
});
document.getElementById('cancelEditBtn').addEventListener('click', () => clearEdit({ clearInput: false, restoreDraft: true }));
sendBtn.addEventListener('click', sendCurrentMessage);
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendCurrentMessage(); } });
// Если пользователь начинает печатать вне поля, переводим фокус в текстбокс.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
  if (document.getElementById('chatScreen').classList.contains('hidden')) return;
  const active = document.activeElement;
  if (active === messageInput || active?.matches('input, textarea, select, button, [contenteditable="true"]')) return;
  messageInput.focus();
});

// Навешиваем события
enterBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (name) {
    loginUser(name);
    showChat();
  } else alert("Пожалуйста, введите имя!");
});

nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enterBtn.click(); });

logoutBtn.addEventListener('click', () => {
  logoutUser();
  showLogin();
});


// Очистка базы (как было)
window.clearChat = async function() {
  if (confirm("Удалить ВСЕ сообщения?")) {
    await remove(messagesRef);
    document.getElementById('messages').innerHTML = '';
    console.log("Чат очищен");
  }
};

const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');

// Обработчик кнопки прикрепления
attachBtn.addEventListener('click', () => {
  fileInput.click(); // Вызываем системное окно выбора файла
});

// Обработчик выбора файла
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  
  if (file) {
    // Забираем текст из основного поля ввода
    const existingText = messageInput.value.trim();
    
    // Открываем модальное окно и передаем туда текст
    showImageModal(file, async (confirmedFile, caption) => {
      const sent = await sendImage(confirmedFile, caption, replyTarget);
      if (sent) {
        clearReply();
<<<<<<< Updated upstream
        messageInput.value = '';
=======
        if (messageInput.value.trim() === existingText) messageInput.value = '';
>>>>>>> Stashed changes
      } else {
        // Возвращаем текст подписи, чтобы его можно было отправить повторно.
        messageInput.value = caption;
      }
    });
    
    // Передаем текст в модальное окно ПОСЛЕ его открытия
    // (модальное окно открывается мгновенно, поэтому мы просто заполняем поле)
    setTimeout(() => {
      document.getElementById('imageCaptionInput').value = existingText;
    }, 0);
  }
  
  fileInput.value = '';
});

document.addEventListener('paste', (event) => {
  const isChatVisible = !document.getElementById('chatScreen').classList.contains('hidden');
  if (!isChatVisible || editingTarget) return;

  const items = (event.clipboardData || window.clipboardData).items;
  
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const existingText = messageInput.value.trim(); // <-- Берем текст
        
        showImageModal(file, async (confirmedFile, caption) => {
          const sent = await sendImage(confirmedFile, caption, replyTarget);
          if (sent) {
            clearReply();
<<<<<<< Updated upstream
            messageInput.value = '';
=======
            if (messageInput.value.trim() === existingText) messageInput.value = '';
>>>>>>> Stashed changes
          } else {
            messageInput.value = caption;
          }
        });
        
        // Вставляем текст в модальное окно
        setTimeout(() => {
          document.getElementById('imageCaptionInput').value = existingText;
        }, 0);
      }
      event.preventDefault();
      break; 
    }
  }
});

// Настройки звука и времени сохраняются локально в браузере.
const settingsModal = document.getElementById('settingsModal');
const soundVolume = document.getElementById('soundVolume');
const soundVolumeValue = document.getElementById('soundVolumeValue');
const timeFormat = document.getElementById('timeFormat');
soundVolume.value = localStorage.getItem('chat_sound_volume') ?? '60';
soundVolumeValue.textContent = `${soundVolume.value}%`;
timeFormat.value = localStorage.getItem('chat_time_format') ?? '24';
setNotificationVolume(soundVolume.value);
document.getElementById('settingsBtn').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('closeSettingsBtn').addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });
soundVolume.addEventListener('input', () => { soundVolumeValue.textContent = `${soundVolume.value}%`; setNotificationVolume(soundVolume.value); });
timeFormat.addEventListener('change', () => {
  localStorage.setItem('chat_time_format', timeFormat.value);
  refreshMessageTimes();
});

// Запуск
initImageViewer();
initAuth(showChat, showLogin);
listenTypingStatus();