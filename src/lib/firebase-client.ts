import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration - hardcoded as provided
const firebaseConfig = {
  apiKey: "AIzaSyCQBkhXfLefbOQHmP5Mw2tmR93U_63YhNM",
  authDomain: "myflixbd01.firebaseapp.com",
  databaseURL: "https://myflixbd01-default-rtdb.firebaseio.com",
  projectId: "myflixbd01",
  storageBucket: "myflixbd01.firebasestorage.app",
  messagingSenderId: "30562578046",
  appId: "1:30562578046:web:b43f91251a45963221b22f",
  measurementId: "G-GCKXR5XKMS"
};

// Initialize Firebase app (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export { app };

// Initialize Realtime Database
export const database = getDatabase(app);

export default firebaseConfig;
