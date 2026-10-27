import { db } from './firebase.js';
import { ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Отдельная запись для этой вкладки/сессии.
const mySessionId = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  .replace(/[^a-zA-Z0-9_-]/g, '');
const onlineUsersRef = ref(db, 'online_users');
const myPresenceRef = ref(db, `online_users/${mySessionId}`);
let unsubscribeOnlineUsers = null;

export async function initPresence() {
  const userName = localStorage.getItem('chat_user_name');
  if (!userName || unsubscribeOnlineUsers) return;

  try {
    // Регистрируем серверную очистку до публикации присутствия.
    await onDisconnect(myPresenceRef).remove();
    await set(myPresenceRef, { user: userName, joinedAt: Date.now() });

    unsubscribeOnlineUsers = onValue(onlineUsersRef, snapshot => {
      const users = snapshot.val() || {};
      const friendOnline = Object.values(users).some(session =>
        session && session.user && session.user !== userName
      );
      const statusEl = document.getElementById('friend-status');
      if (!statusEl) return;

      statusEl.textContent = friendOnline ? 'Собеседник онлайн' : 'Собеседник оффлайн';
      statusEl.style.color = friendOnline ? '#4caf50' : '#888888';
    }, error => {
      console.error('Не удалось получить статус собеседника:', error);
    });
  } catch (error) {
    console.error('Не удалось обновить статус присутствия:', error);
  }
}

export function removePresence() {
  if (unsubscribeOnlineUsers) {
    unsubscribeOnlineUsers();
    unsubscribeOnlineUsers = null;
  }
  remove(myPresenceRef).catch(error => {
    console.error('Не удалось очистить статус присутствия:', error);
  });
}
