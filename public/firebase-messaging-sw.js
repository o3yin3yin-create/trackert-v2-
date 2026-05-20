importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjfeyhQy8EN507J7NKz11PI-HOu8PAUL4",
  authDomain: "tracker-v2-310.firebaseapp.com",
  projectId: "tracker-v2-310",
  storageBucket: "tracker-v2-310.firebasestorage.app",
  messagingSenderId: "114149572420",
  appId: "1:114149572420:web:7bb09e166687bf90a76111"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || "تذكير من 6afra Tracker";
  const notificationOptions = {
    body: payload.notification?.body || "حان وقت تسجيل عاداتك!",
    icon: '/icon.png',
    badge: '/icon.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});