import { initTheme, toggleTheme, displayMessage } from './modules/ui.js';
import { initAuth, loginUser, logoutUser, currentUser } from './modules/auth.js';
import { listenForMessages, sendTextMessage } from './modules/chat.js';
import { sendImage } from './modules/images.js';
import { messagesRef } from './modules/firebase.js';
import { remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showImageModal } from './modules/modal.js';
import { startTyping, stopTyping, listenTypingStatus, markAsRead } from './modules/status.js';
import { initImageViewer } from './modules/viewer.js';

// Элементы интерфейса
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const nameInput = document.getElementById('nameInput');
const enterBtn = document.getElementById('enterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Функции-обертки для интерфейса
function showChat() {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  messageInput.focus();
}

function showLogin() {
  chatScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  logoutBtn.classList.add('hidden');
  nameInput.value = "";
  nameInput.focus();
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
    // Вызываем модальное окно. Если пользователь нажмет "Отправить",
    // сработает коллбэк, который передаст файл в sendImage
    showImageModal(file, (confirmedFile) => {
      sendImage(confirmedFile);
    });
  }
  
  // Очищаем инпут
  fileInput.value = '';
});

// Запуск
initTheme();
initImageViewer();
initAuth(showChat, showLogin);
listenForMessages();
listenTypingStatus();
markAsRead();