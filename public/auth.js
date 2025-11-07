// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAXVYiq-OtSVrO9WEO4v3lZmWEzbuRtE4",
  authDomain: "repox-saas.firebaseapp.com",
  projectId: "repox-saas",
  storageBucket: "repox-saas.firebasestorage.app",
  messagingSenderId: "696415907685",
  appId: "1:696415907685:web:2d2e7292299d0e31eafb8c",
  measurementId: "G-FJHVME2EVY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);