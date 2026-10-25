import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAi97CGDxJQ4eoM3_OBicc100Hc9TpNsTo",
  authDomain: "my-chat-app-62fa5.firebaseapp.com",
  databaseURL: "https://my-chat-app-62fa5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "my-chat-app-62fa5",
  storageBucket: "my-chat-app-62fa5.firebasestorage.app",
  messagingSenderId: "211357964460",
  appId: "1:211357964460:web:71235525d3a0139d49a709"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const messagesRef = ref(db, 'messages');