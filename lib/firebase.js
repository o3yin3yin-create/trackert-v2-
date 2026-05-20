import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBjfeyhQy8EN507J7NKz11PI-HOuBPAUL4",
  authDomain: "tracker-v2-310.firebaseapp.com",
  projectId: "tracker-v2-310",
  storageBucket: "tracker-v2-310.firebasestorage.app",
  messagingSenderId: "114149572420",
  appId: "1:114149572420:web:b760bd11bd3d3132a76111",
  measurementId: "G-N0GHZ3XW7C"
};

// بنشغل فايربيز مرة واحدة بس عشان ميعملش إيرور تكرار
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// بنشغل الـ Messaging في المتصفح بس عشان السيرفر ميزعلش
let messaging = null;
if (typeof window !== "undefined") {
  messaging = getMessaging(app);
}

export { app, messaging, getToken, isSupported };