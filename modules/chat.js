import { db, messagesRef } from './firebase.js';
import { push, onChildAdded, onChildChanged, onChildRemoved, serverTimestamp, off, query, orderByKey, limitToLast, endAt, get, ref } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { displayMessage, updateMessageStatus } from './ui.js';
import { showNotification } from './notifications.js';

const PAGE_SIZE = 20;
let activeUser = null;
let oldestLoadedKey = null;
let loadingOlder = false;
let hasOlder = true;
const loadedIds = new Set();
const liveIds = new Set();
let liveQuery = null;

function renderSnapshot(snapshot, prepend = false) {
  const data = snapshot.val();
  const id = snapshot.key;
  if (!data || loadedIds.has(id)) return;
  loadedIds.add(id);
  displayMessage(data.name, data.text || "", data.image || null, activeUser, data.read || false, id, data.timestamp, data.replyTo || null, prepend);
  if (!oldestLoadedKey || id < oldestLoadedKey) oldestLoadedKey = id;
}

export function listenForMessages(user) {
  activeUser = user;
  oldestLoadedKey = null;
  hasOlder = true;
  loadingOlder = false;
  loadedIds.clear(); liveIds.clear();
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  liveQuery = query(messagesRef, orderByKey(), limitToLast(PAGE_SIZE));
  const unsubAdded = onChildAdded(liveQuery, (snapshot) => {
    const existed = loadedIds.has(snapshot.key);
    liveIds.add(snapshot.key);
    renderSnapshot(snapshot, false);
    const data = snapshot.val();
    const status = document.getElementById('status-indicator');
    status.textContent = "Подключено"; status.classList.add('connected');
    // Не показываем уведомления на начальную загрузку истории.
    if (!existed && data && data.name !== user && messagesDiv.scrollHeight > messagesDiv.clientHeight) {
      showNotification(data.name, data.text, !!data.image);
    }
  });
  const unsubChanged = onChildChanged(liveQuery, (snapshot) => {
    const data = snapshot.val();
    if (data.name === user) updateMessageStatus(snapshot.key, data.read);
  });
  const unsubRemoved = onChildRemoved(liveQuery, (snapshot) => {
    // Firebase удаляет элемент из ограниченного запроса и когда он просто выпадает из последних 20.
    // Поэтому удаляем из DOM только если запись действительно отсутствует в базе.
    get(ref(db, `messages/${snapshot.key}`)).then((check) => {
      if (!check.exists()) {
        const el = document.querySelector(`.message[data-id="${snapshot.key}"]`);
        if (el) el.remove();
        loadedIds.delete(snapshot.key);
      }
    });
  });
  messagesDiv.onscroll = () => { if (messagesDiv.scrollTop < 80) loadOlderMessages(); };
  return () => {
    off(liveQuery, 'child_added', unsubAdded); off(liveQuery, 'child_changed', unsubChanged); off(liveQuery, 'child_removed', unsubRemoved);
    messagesDiv.onscroll = null;
    activeUser = null;
  };
}

export async function loadOlderMessages() {
  if (loadingOlder || !hasOlder || !oldestLoadedKey) return;
  loadingOlder = true;
  const box = document.getElementById('messages');
  const oldHeight = box.scrollHeight;
  try {
    const olderQuery = query(messagesRef, orderByKey(), endAt(oldestLoadedKey), limitToLast(PAGE_SIZE + 1));
    const snapshot = await get(olderQuery);
    const rows = [];
    snapshot.forEach(child => { if (child.key !== oldestLoadedKey && !loadedIds.has(child.key)) rows.push(child); });
    if (rows.length === 0) { hasOlder = false; return; }
    rows.slice().reverse().forEach(row => renderSnapshot(row, true));
    box.scrollTop = box.scrollHeight - oldHeight;
    if (rows.length < PAGE_SIZE) hasOlder = false;
  } catch (error) { console.error('Не удалось загрузить старые сообщения:', error); }
  finally { loadingOlder = false; }
}

export async function sendTextMessage(text, replyTo = null) {
  const currentUser = localStorage.getItem('chat_user_name');
  const cleanText = (text || '').trim();
  if (!cleanText || !currentUser) return;
  try {
    const payload = { name: currentUser, text: cleanText, read: false, timestamp: serverTimestamp() };
    if (replyTo) payload.replyTo = replyTo;
    await push(messagesRef, payload);
  } catch (error) { console.error('Ошибка отправки:', error); }
}
