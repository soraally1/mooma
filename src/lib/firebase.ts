// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCVfkU-ET4gYKPdMthfhztCm9bUfXdEO3w",
  authDomain: "moomadev.firebaseapp.com",
  projectId: "moomadev",
  storageBucket: "moomadev.firebasestorage.app",
  messagingSenderId: "908204686715",
  appId: "1:908204686715:web:301e4841995d82125391de",
  measurementId: "G-SWG0PBN0QJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize analytics only on client side
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Auth and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();