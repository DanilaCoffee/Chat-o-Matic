import { messagesRef } from './firebase.js';
import { push, onChildAdded, onChildChanged, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { currentUser } from './auth.js';
import { displayMessage, updateMessageStatus } from './ui.js';

export function listenForMessages() {
  // Слушаем новые сообщения
  onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageId = snapshot.key;
    if (currentUser) {
      displayMessage(data.name, data.text || "", data.image || null, currentUser, data.read || false, messageId, data.timestamp);
      
      const status = document.getElementById('status-indicator');
      status.textContent = "Подключено";
      status.classList.add('connected');
    }
  });

  // Слушаем ИЗМЕНЕНИЯ (когда друг читает наши сообщения)
  onChildChanged(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageId = snapshot.key;
    if (data.name === currentUser) {
      updateMessageStatus(messageId, data.read);
    }
  });
}

export async function sendTextMessage(text) {
  if (!text || !currentUser) return;
  try {
    await push(messagesRef, {
      name: currentUser,
      text: text,
      read: false, // По умолчанию не прочитано
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Ошибка отправки:", error);
  }
}