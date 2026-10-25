import { db } from './firebase.js';
import { ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Генерируем уникальный ID для этой вкладки/сессии
const mySessionId = Math.random().toString(36).substring(2, 10);
const onlineUsersRef = ref(db, 'online_users');
const myPresenceRef = ref(db, `online_users/${mySessionId}`);

export function initPresence() {
  // Записываем себя как онлайн
  set(myPresenceRef, { joinedAt: Date.now() });

  // Если соединение оборвется (закрыли вкладку, пропал интернет), Firebase удалит нас
  onDisconnect(myPresenceRef).remove();

  // Слушаем изменения в списке онлайн-пользователей
  onValue(onlineUsersRef, (snapshot) => {
    const users = snapshot.val();
    const onlineCount = users ? Object.keys(users).length : 0;
    
    const statusEl = document.getElementById('friend-status');
    if (!statusEl) return;

    // Если онлайн больше 1 человека (вы + друг) 
    if (onlineCount > 1) {
      statusEl.textContent = "Собеседник онлайн";
      statusEl.style.color = "#4caf50"; // Зеленый
    } else {
      statusEl.textContent = "Собеседник оффлайн";
      statusEl.style.color = "#888888"; // Серый
    }
  });
}

// Функция для выхода (вызывать при нажатии "Выйти")
export function removePresence() {
  remove(myPresenceRef);
}