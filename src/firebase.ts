import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyChJxC-bPsHg2xReGkt5jEyrwjFXc22tAs",
  authDomain: "municipality-heraklion.firebaseapp.com",
  projectId: "municipality-heraklion",
  storageBucket: "municipality-heraklion.firebasestorage.app",
  messagingSenderId: "77407830182",
  appId: "1:77407830182:web:a27eebfa544a822bdaf467",
  measurementId: "G-1LZNHNLLBT"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
    vapidKey: 'KZK3lYi3Tu8dzbX46RbDi3gyhPd4f9wurjXr5eGyMAk'
});
      console.log('FCM Token:', token);
      return token;
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
  return null;
};

export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

export default app;