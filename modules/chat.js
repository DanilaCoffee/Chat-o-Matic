import { db, messagesRef } from './firebase.js';
import {
  push, onChildAdded, onChildChanged, onChildRemoved, serverTimestamp,
  query, orderByKey, limitToLast, endAt, get, ref, update
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { displayMessage, updateMessageStatus } from './ui.js';
import { showNotification } from './notifications.js';

const PAGE_SIZE = 20;
let activeUser = null;
let oldestLoadedKey = null;
let loadingOlder = false;
let hasOlder = true;
const loadedIds = new Set();
let pendingReadUpdates = {};
let readUpdateScheduled = false;

function findRenderedMessage(id) {
  return Array.from(document.querySelectorAll('#messages .message'))
    .find(element => element.dataset.id === id);
}

function markMessageAsRead(id, data, user = activeUser) {
  if (!user || !data || data.name === user || data.read) return;

  // Объединяем несколько отметок в один root-update, чтобы не отправлять
  // отдельный запрос для каждого непрочитанного сообщения на загруженной странице.
  pendingReadUpdates[`messages/${id}/read`] = true;
  if (readUpdateScheduled) return;
  readUpdateScheduled = true;
  queueMicrotask(async () => {
    const updates = pendingReadUpdates;
    pendingReadUpdates = {};
    readUpdateScheduled = false;
    if (!activeUser || Object.keys(updates).length === 0) return;
    try {
      await update(ref(db), updates);
    } catch (error) {
      console.error('Не удалось отметить сообщения как прочитанные:', error);
    }
  });
}

function renderSnapshot(snapshot, prepend = false) {
  const data = snapshot.val();
  const id = snapshot.key;
  if (!data || loadedIds.has(id)) return false;

  loadedIds.add(id);
  displayMessage(
    data.name, data.text || '', data.image || null, activeUser,
    data.read || false, id, data.timestamp, data.replyTo || null,
    prepend, data.edited || false
  );
  if (!oldestLoadedKey || id < oldestLoadedKey) oldestLoadedKey = id;
  markMessageAsRead(id, data);
  return true;
}

function renderChangedSnapshot(snapshot) {
  const data = snapshot.val();
  if (!data || !loadedIds.has(snapshot.key)) return;
  displayMessage(
    data.name, data.text || '', data.image || null, activeUser,
    data.read || false, snapshot.key, data.timestamp, data.replyTo || null,
    false, data.edited || false
  );
  if (data.name === activeUser) updateMessageStatus(snapshot.key, data.read);
  else markMessageAsRead(snapshot.key, data);
}

export function listenForMessages(user) {
  activeUser = user;
  oldestLoadedKey = null;
  hasOlder = true;
  loadingOlder = false;
  loadedIds.clear();
  pendingReadUpdates = {};

  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  const liveQuery = query(messagesRef, orderByKey(), limitToLast(PAGE_SIZE));

  // onChildAdded initially replays existing query results. Queue those events
  // until a one-shot snapshot tells us which messages are the initial history,
  // so opening a chat does not play 20 old-message notifications.
  let initializing = true;
  let disposed = false;
  let pendingAdded = [];
  const pendingChanged = new Map();
  const removedDuringInit = new Set();
  let initialIds = new Set();

  const unsubAdded = onChildAdded(liveQuery, snapshot => {
    if (initializing) {
      pendingAdded.push(snapshot);
      return;
    }

    const wasLoaded = loadedIds.has(snapshot.key);
    const data = snapshot.val();
    renderSnapshot(snapshot, false);
    if (!wasLoaded && data && data.name !== user) {
      showNotification(data.name, data.text || '', !!data.image);
    }
  });

  // This listener receives individual changed children, not a full history snapshot.
  const unsubChanged = onChildChanged(messagesRef, snapshot => {
    if (initializing) {
      pendingChanged.set(snapshot.key, snapshot);
      return;
    }
    renderChangedSnapshot(snapshot);
  });

  const unsubRemoved = onChildRemoved(messagesRef, snapshot => {
    const id = snapshot.key;
    if (initializing) removedDuringInit.add(id);
    const element = findRenderedMessage(id);
    if (element) element.remove();
    loadedIds.delete(id);
    if (oldestLoadedKey === id) {
      const firstLoaded = document.querySelector('#messages .message');
      oldestLoadedKey = firstLoaded ? firstLoaded.dataset.id : null;
    }
  });

  messagesDiv.onscroll = () => {
    if (messagesDiv.scrollTop < 80) loadOlderMessages();
  };

  get(liveQuery).then(snapshot => {
    if (disposed) return;

    snapshot.forEach(child => {
      initialIds.add(child.key);
      if (!removedDuringInit.has(child.key)) renderSnapshot(child, false);
    });

    // Reconcile child-added events that arrived while the initial snapshot loaded.
    for (const child of pendingAdded) {
      if (removedDuringInit.has(child.key)) continue;
      const wasLoaded = loadedIds.has(child.key);
      const data = child.val();
      renderSnapshot(child, false);
      if (!wasLoaded && !initialIds.has(child.key) && data && data.name !== user) {
        showNotification(data.name, data.text || '', !!data.image);
      }
    }
    pendingAdded = [];

    // Apply changes that landed during initial loading, after their base rows exist.
    for (const changedSnapshot of pendingChanged.values()) {
      renderChangedSnapshot(changedSnapshot);
    }
    pendingChanged.clear();
    initializing = false;

    const status = document.getElementById('status-indicator');
    status.textContent = 'Подключено';
    status.classList.add('connected');
    if (initialIds.size < PAGE_SIZE) hasOlder = false;
  }).catch(error => {
    console.error('Не удалось загрузить последние сообщения:', error);
    // If the one-shot read fails, still render whatever the live listener delivered,
    // but suppress notifications because the initial/live distinction is unknown.
    if (disposed) return;
    for (const child of pendingAdded) {
      if (!removedDuringInit.has(child.key)) renderSnapshot(child, false);
    }
    pendingAdded = [];
    for (const changedSnapshot of pendingChanged.values()) renderChangedSnapshot(changedSnapshot);
    pendingChanged.clear();
    initializing = false;
  });

  return () => {
    disposed = true;
    unsubAdded();
    unsubChanged();
    unsubRemoved();
    messagesDiv.onscroll = null;
    activeUser = null;
    pendingReadUpdates = {};
    pendingAdded = [];
    pendingChanged.clear();
  };
}

export async function loadOlderMessages() {
  if (loadingOlder || !hasOlder || !oldestLoadedKey || !activeUser) return false;
  loadingOlder = true;
  const box = document.getElementById('messages');
  const oldHeight = box.scrollHeight;
  const oldTop = box.scrollTop;

  try {
    const olderQuery = query(messagesRef, orderByKey(), endAt(oldestLoadedKey), limitToLast(PAGE_SIZE + 1));
    const snapshot = await get(olderQuery);
    const rows = [];
    snapshot.forEach(child => {
      if (child.key !== oldestLoadedKey && !loadedIds.has(child.key)) rows.push(child);
    });

    if (rows.length === 0) {
      hasOlder = false;
      return false;
    }

    // Iterate newest-to-oldest while prepending, yielding chronological DOM order.
    rows.slice().reverse().forEach(row => renderSnapshot(row, true));
    box.scrollTop = oldTop + (box.scrollHeight - oldHeight);
    if (rows.length < PAGE_SIZE) hasOlder = false;
    return true;
  } catch (error) {
    console.error('Не удалось загрузить старые сообщения:', error);
    return false;
  } finally {
    loadingOlder = false;
  }
}

export async function sendTextMessage(text, replyTo = null) {
  const currentUser = localStorage.getItem('chat_user_name');
  const cleanText = (text || '').trim();
  if (!cleanText || !currentUser) return false;

  try {
    const payload = {
      name: currentUser,
      text: cleanText,
      read: false,
      timestamp: serverTimestamp()
    };
    if (replyTo) payload.replyTo = replyTo;
    await push(messagesRef, payload);
    return true;
  } catch (error) {
    console.error('Ошибка отправки:', error);
    alert('Не удалось отправить сообщение. Текст оставлен в поле ввода; проверь подключение к Firebase.');
    return false;
  }
}

export async function updateTextMessage(messageId, text) {
  const currentUser = localStorage.getItem('chat_user_name');
  if (!messageId || !currentUser) return false;

  const cleanText = (text || '').trim();
  try {
    const messageRef = ref(db, `messages/${messageId}`);
    const snapshot = await get(messageRef);
    if (!snapshot.exists()) {
      alert('Это сообщение уже удалено.');
      return false;
    }
    if (snapshot.val().name !== currentUser) {
      alert('Можно изменять только собственные сообщения.');
      return false;
    }

    await update(messageRef, {
      text: cleanText,
      edited: true,
      editedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Ошибка изменения сообщения:', error);
    alert('Не удалось изменить сообщение. Проверь подключение к Firebase.');
    return false;
  }
}
