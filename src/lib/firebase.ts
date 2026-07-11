import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD3CmcJjZP3-iM1okn4yjEnmzuFC3-UHaU",
  authDomain: "trip-e-bikes.firebaseapp.com",
  projectId: "trip-e-bikes",
  storageBucket: "trip-e-bikes.firebasestorage.app",
  messagingSenderId: "1064564056164",
  appId: "1:1064564056164:web:a68996a4bb6b9e3df0bf71",
  measurementId: "G-2V9PW3T35J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, storage, auth, googleProvider };
