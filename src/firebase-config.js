import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "yjys-4102e.firebaseapp.com",
    projectId: "yjys-4102e",
    storageBucket: "yjys-4102e.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase app initialized:', app);
console.log('Firestore db:', db);

export { db };