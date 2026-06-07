import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADbwo04K1iesGGQxz0gF00x99N2dDfUfg",
  authDomain: "alert-app-3c556.firebaseapp.com",
  projectId: "alert-app-3c556",
  storageBucket: "alert-app-3c556.firebasestorage.app",
  messagingSenderId: "310034247439",
  appId: "1:310034247439:web:cdbb35fff49cf787b8187a",
  measurementId: "G-R2136BCQB6"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;