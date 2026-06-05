import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY!,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID!,
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID!,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
    vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY!
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