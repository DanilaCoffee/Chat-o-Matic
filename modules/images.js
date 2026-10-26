import { messagesRef } from './firebase.js';
import { push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Функция для сжатия картинки (остается без изменений)
function compressImage(file, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Обновленная функция отправки
export async function sendImage(file, captionText = "") {
  const currentUser = localStorage.getItem('chat_user_name');
  if (!file || !currentUser) return;

  const statusIndicator = document.getElementById('status-indicator');
  const originalText = statusIndicator.textContent;
  statusIndicator.textContent = "Сжимаем...";

  try {
    const base64Image = await compressImage(file);
    
    statusIndicator.textContent = "Отправляем...";
    
    await push(messagesRef, {
      name: currentUser,
      image: base64Image,
      text: captionText, // <-- Сохраняем текст вместе с картинкой
      read: false,
      timestamp: serverTimestamp()
    });
    
    statusIndicator.textContent = "Подключено";
    statusIndicator.classList.add('connected');
  } catch (error) {
    console.error("Ошибка отправки картинки:", error);
    statusIndicator.textContent = originalText;
    alert("Не удалось отправить картинку. Возможно, она слишком большая.");
  }
}