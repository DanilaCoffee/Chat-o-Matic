import { initTheme, toggleTheme, displayMessage } from './modules/ui.js';
import { initAuth, loginUser, logoutUser, currentUser } from './modules/auth.js';
import { listenForMessages, sendTextMessage } from './modules/chat.js';
import { sendImage } from './modules/images.js';
import { messagesRef } from './modules/firebase.js';
import { remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showImageModal } from './modules/modal.js';
import { startTyping, stopTyping, listenTypingStatus, markAsRead } from './modules/status.js';
import { initImageViewer } from './modules/viewer.js';
import { requestNotificationPermission } from './modules/notifications.js';
import { initPresence, removePresence } from './modules/presence.js';

// Элементы интерфейса
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const nameInput = document.getElementById('nameInput');
const enterBtn = document.getElementById('enterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
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

messageInput.addEventListener('input', () => {
  startTyping();
});

// Останавливаем печать при отправке
sendBtn.addEventListener('click', () => {
  stopTyping(); // <-- Добавьте это
  sendTextMessage(messageInput.value);
  messageInput.value = '';
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    stopTyping(); // <-- Добавьте это
    sendTextMessage(messageInput.value);
    messageInput.value = '';
  }
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

themeToggleBtn.addEventListener('change', toggleTheme);

sendBtn.addEventListener('click', () => {
  sendTextMessage(messageInput.value);
  messageInput.value = '';
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendTextMessage(messageInput.value);
    messageInput.value = '';
  }
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
    showImageModal(file, (confirmedFile, caption) => {
      // Если пользователь подтвердил, отправляем картинку с подписью
      sendImage(confirmedFile, caption);
      
      // Очищаем основное поле ввода, так как текст уже ушел с картинкой
      messageInput.value = '';
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
  if (!isChatVisible) return;

  const items = (event.clipboardData || window.clipboardData).items;
  
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const existingText = messageInput.value.trim(); // <-- Берем текст
        
        showImageModal(file, (confirmedFile, caption) => {
          sendImage(confirmedFile, caption);
          messageInput.value = ''; // <-- Очищаем
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

// Запуск
initTheme();
initImageViewer();
initAuth(showChat, showLogin);
listenTypingStatus();
markAsRead();