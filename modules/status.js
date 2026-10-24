import { db, messagesRef } from './firebase.js';
import { ref, set, onValue, remove, update, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { currentUser } from './auth.js';

let friendTypingInterval = null;
let typingTimeout = null;
const typingRef = ref(db, 'typing_status');
const presenceRef = ref(db, 'presence');

// === 0. ЗВУК ПРИХОДА СООБЩЕНИЯ (тудунц) ===
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/** Короткий приятный "тудунц" через Web Audio API */
export function playMessageSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Основной тон
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);          // A5
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.15);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Второй обертон (чуть ниже и тише) — даёт "тудунц"
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(660, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(330, now + 0.2);
    gain2.gain.setValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.warn('Не удалось воспроизвести звук:', e);
  }
}

// === 1. ПРИСУТСТВИЕ (онлайн / оффлайн) ===
/** Имя → безопасный ключ Firebase (без . # $ [ ] /) */
function safeKey(name) {
  return String(name).replace(/[.#$\[\]\/]/g, '_');
}

export function setOnline() {
  if (!currentUser) return;

  const userPresenceRef = ref(db, `presence/${safeKey(currentUser)}`);

  // Ставим онлайн + сохраняем оригинальное имя
  set(userPresenceRef, {
    online: true,
    name: currentUser,
    lastSeen: serverTimestamp()
  });

  // При отключении (закрытие вкладки, потеря сети) — оффлайн
  onDisconnect(userPresenceRef).set({
    online: false,
    name: currentUser,
    lastSeen: serverTimestamp()
  });
}

export function setOffline() {
  if (!currentUser) return;
  const userPresenceRef = ref(db, `presence/${safeKey(currentUser)}`);
  set(userPresenceRef, {
    online: false,
    name: currentUser,
    lastSeen: serverTimestamp()
  });
}


/** Слушаем кто онлайн и обновляем индикатор */
export function listenPresence() {
  onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() || {};
    const indicator = document.getElementById('status-indicator');
    const onlineUsersEl = document.getElementById('online-users');
    if (!indicator) return;

    // Список онлайн-пользователей кроме себя
    const onlineOthers = Object.entries(data)
      .filter(([, info]) => info && info.online && info.name !== currentUser)
      .map(([, info]) => info.name || '???');


    if (onlineOthers.length > 0) {
      indicator.textContent = 'Онлайн';
      indicator.classList.add('connected');
      indicator.classList.remove('offline');
      if (onlineUsersEl) {
        onlineUsersEl.textContent = onlineOthers.join(', ');
        onlineUsersEl.classList.remove('hidden');
      }
    } else {
      // Никого больше нет — показываем "оффлайн" или просто "Подключено"
      indicator.textContent = 'Оффлайн';
      indicator.classList.remove('connected');
      indicator.classList.add('offline');
      if (onlineUsersEl) {
        onlineUsersEl.textContent = '';
        onlineUsersEl.classList.add('hidden');
      }
    }
  });
}

// === 2. ИНДИКАТОР "ПЕЧАТАЕТ..." ===
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

// === 3. СТАТУС "ПРОЧИТАНО" ===
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
