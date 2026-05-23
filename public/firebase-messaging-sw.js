importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyChJxC-bPsHg2xReGkt5jEyrwjFXc22tAs",
  authDomain: "municipality-heraklion.firebaseapp.com",
  projectId: "municipality-heraklion",
  storageBucket: "municipality-heraklion.firebasestorage.app",
  messagingSenderId: "77407830182",
  appId: "1:77407830182:web:a27eebfa544a822bdaf467"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png'
  });
});