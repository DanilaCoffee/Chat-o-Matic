import { db, messagesRef } from './firebase.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { currentUser } from './auth.js';

let friendTypingInterval = null;
let typingTimeout = null;
const typingRef = ref(db, 'typing_status');

// === 1. ИНДИКАТОР "ПЕЧАТАЕТ..." ===
// Вызывается, когда печатаете ВЫ. Только отправляет сигнал, ничего не рисует.
export function startTyping() {
  if (!currentUser) return;
  
  // Сообщаем Firebase, что печатаем
  set(typingRef, { user: currentUser, timestamp: Date.now() });

  // Если пользователь перестал печатать на 2 секунды, убираем статус из базы
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    stopTyping();
  }, 2000);
}

// Вызывается, когда вы перестали печатать или отправили сообщение.
export function stopTyping() {
  if (!currentUser) return;
  remove(typingRef);
  clearTimeout(typingTimeout);
}

// Слушаем, печатает ли кто-то другой. Только эта функция рисует текст на экране.
export function listenTypingStatus() {
  onValue(typingRef, (snapshot) => {
    const data = snapshot.val();
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;

    // Если в базе есть запись, и это НЕ мы
    if (data && data.user !== currentUser) {
      let dots = 0;
      clearInterval(friendTypingInterval);
      friendTypingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        indicator.textContent = "Собеседник печатает" + ".".repeat(dots);
      }, 500);
    } else {
      // Если никто не печатает, или печатаем мы сами — очищаем экран
      clearInterval(friendTypingInterval);
      indicator.textContent = "";
    }
  });
}

// === 2. СТАТУС "ПРОЧИТАНО" ===
export function markAsRead() {
  onValue(messagesRef, (snapshot) => {
    const messages = snapshot.val();
    if (!messages) return;

    const updates = {};
    let hasUnread = false;

    for (const key in messages) {
      const msg = messages[key];
      if (msg.name !== currentUser && !msg.read) {
        updates[`messages/${key}/read`] = true;
        hasUnread = true;
      }
    }

    if (hasUnread) {
      update(ref(db), updates);
    }
  });
}