import { messagesRef } from './firebase.js';
import { push, onChildAdded, onChildChanged, serverTimestamp, off } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { displayMessage, updateMessageStatus } from './ui.js';
import { showNotification } from './notifications.js';

export function listenForMessages(user) {
  const unsubAdded = onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageId = snapshot.key;
    
    if (user) {
      // Отрисовываем сообщение
      displayMessage(data.name, data.text || "", data.image || null, user, data.read || false, messageId, data.timestamp);
      
      const status = document.getElementById('status-indicator');
      status.textContent = "Подключено";
      status.classList.add('connected');

      // === УВЕДОМЛЕНИЯ ===
      // Показываем уведомление только если сообщение не от нас
      if (data.name !== user) {
        showNotification(data.name, data.text, !!data.image);
      }
    }
  });

  const unsubChanged = onChildChanged(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageId = snapshot.key;
    if (data.name === user) {
      updateMessageStatus(messageId, data.read);
    }
  });

  return () => {
    off(messagesRef, 'child_added', unsubAdded);
    off(messagesRef, 'child_changed', unsubChanged);
  };
}
export async function sendTextMessage(text) {
  const currentUser = localStorage.getItem('chat_user_name'); // Берем имя прямо из хранилища для надежности
  if (!text || !currentUser) return;
  try {
    await push(messagesRef, {
      name: currentUser,
      text: text,
      read: false,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Ошибка отправки:", error);
  }
}