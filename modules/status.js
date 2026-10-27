import { db } from './firebase.js';
import { ref, set, onValue, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { currentUser } from './auth.js';

let friendTypingInterval = null;
let typingTimeout = null;
const typingRootRef = ref(db, 'typing_status');
const sessionId = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  .replace(/[^a-zA-Z0-9_-]/g, '');
const ownTypingRef = ref(db, `typing_status/${sessionId}`);
let disconnectCleanupRegistered = false;

// У каждого открытого клиента собственная запись: один пользователь больше
// не может случайно стереть индикатор набора другого пользователя.
export function startTyping() {
  if (!currentUser) return;

  if (!disconnectCleanupRegistered) {
    disconnectCleanupRegistered = true;
    onDisconnect(ownTypingRef).remove().catch(error => {
      console.error('Не удалось настроить очистку статуса набора:', error);
      disconnectCleanupRegistered = false;
    });
  }

  set(ownTypingRef, { user: currentUser, timestamp: Date.now() }).catch(error => {
    console.error('Не удалось обновить статус набора:', error);
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
}

export function stopTyping() {
  clearTimeout(typingTimeout);
  typingTimeout = null;
  remove(ownTypingRef).catch(error => {
    console.error('Не удалось очистить статус набора:', error);
  });
}

export function listenTypingStatus() {
  onValue(typingRootRef, snapshot => {
    const data = snapshot.val();
    const now = Date.now();
    const anotherUserTyping = data && Object.values(data).some(item =>
      item && item.user && item.user !== currentUser &&
      Number.isFinite(Number(item.timestamp)) && now - Number(item.timestamp) < 5000
    );
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;

    if (anotherUserTyping) {
      if (friendTypingInterval === null) {
        let dots = 0;
        friendTypingInterval = setInterval(() => {
          dots = (dots + 1) % 4;
          indicator.textContent = 'Собеседник печатает' + '.'.repeat(dots);
        }, 500);
      }
    } else {
      clearInterval(friendTypingInterval);
      friendTypingInterval = null;
      indicator.textContent = '';
    }
  }, error => {
    console.error('Не удалось получить статус набора:', error);
  });
}
