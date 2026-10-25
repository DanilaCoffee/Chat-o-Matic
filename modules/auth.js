// Экспортируем переменную состояния
export let currentUser = "";

export function initAuth(loginCallback, logoutCallback) {
  const savedName = localStorage.getItem('chat_user_name');
  if (savedName) {
    currentUser = savedName;
    loginCallback(savedName);
  } else {
    logoutCallback();
  }
}

export function loginUser(name) {
  currentUser = name;
  localStorage.setItem('chat_user_name', name);
}

export function logoutUser() {
  currentUser = "";
  localStorage.removeItem('chat_user_name');
}