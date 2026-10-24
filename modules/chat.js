import { messagesRef } from './firebase.js';
import { push, onChildAdded, onChildChanged, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { currentUser } from './auth.js';
import { displayMessage, updateMessageStatus } from './ui.js';
import { playMessageSound } from './status.js';

export function listenForMessages() {
  // Флаг: пока true — это начальная загрузка истории, звук не нужен
  let isInitialLoad = true;

  // Через небольшой таймаут считаем, что история уже подгружена
  // (onChildAdded синхронно отдаёт все существующие дети при подписке)
  setTimeout(() => {
    isInitialLoad = false;
  }, 1500);

  // Слушаем новые сообщения
  onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageId = snapshot.key;
    if (currentUser) {
      displayMessage(data.name, data.text || "", data.image || null, currentUser, data.read || false, messageId, data.timestamp);

      // Звук только для чужих сообщений и только после загрузки истории
      if (!isInitialLoad && data.name !== currentUser) {
        playMessageSound();
      }
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