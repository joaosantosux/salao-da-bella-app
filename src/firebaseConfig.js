import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 1. IMPORTE O getAuth

const firebaseConfig = {
  apiKey: "AIzaSyCz6tiTUrdrZe_aNnpAJJ257J35cDv26uY",
  authDomain: "appcreate-01916601.firebaseapp.com",
  projectId: "appcreate-01916601",
  storageBucket: "appcreate-01916601.firebasestorage.app",
  messagingSenderId: "259695397303",
  appId: "1:259695397303:web:5d2261c6d15263efe48032"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // 2. INICIALIZE O AUTH

export { db, auth }; // 3. EXPORTE O AUTH JUNTO COM O DB