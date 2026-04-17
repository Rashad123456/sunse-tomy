import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBfrF1x68TxgOrX0-4MGA5KUAZl7JgogAA',
  authDomain: 'shunchi-tomay.firebaseapp.com',
  projectId: 'shunchi-tomay',
  storageBucket: 'shunchi-tomay.firebasestorage.app',
  messagingSenderId: '385581896175',
  appId: '1:385581896175:web:7d3311af7162243038661a',
  measurementId: 'G-FWPK3X28DR'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const defaultContent = {
  siteName: 'শুনছি তোমায়',
  tagline: 'তোমার মনের কথা শোনার জন্য আমরা আছি।',
  phone: '0969187260',
  whatsapp: '',
  heroImage: 'assets/hero-illustration.svg',
  about: 'শুনছি তোমায় একটি calm এবং supportive mental wellness platform, যেখানে কেউ চাইলে নাম গোপন রেখে নিজের কথা জানাতে পারে, breathing exercise করতে পারে, simple mind tool ব্যবহার করতে পারে এবং নিজের জন্য একটু safe জায়গা খুঁজে নিতে পারে।',
  emergencyText: 'যদি আপনি নিজেকে বা অন্য কাউকে ক্ষতি করার ঝুঁকিতে থাকেন, দয়া করে এখনই পরিবারের কাউকে, trusted person, নিকটস্থ হাসপাতাল বা স্থানীয় emergency service-এর সাথে যোগাযোগ করুন।',
  heroPrimaryButton: 'কথা বলতে চাই',
  heroSecondaryButton: 'এখনই একটু শান্ত হতে চাই',
  quotes: [
    'আজ শুধু বেঁচে থাকাটাও একটি বড় achievement।',
    'সবসময় strong হওয়া লাগে না, কখনও কখনও শুধু কথা বলাটাই যথেষ্ট।',
    'তুমি একা নও। একটু ধীরে শ্বাস নাও, আমরা আছি।'
  ],
  exercises: [
    {
      title: '৫-৪-৩-২-১ Grounding',
      text: '৫টি জিনিস দেখো, ৪টি ছুঁয়ে দেখো, ৩টি শব্দ শোনো, ২টি গন্ধ অনুভব করো, ১টি গভীর শ্বাস নাও।'
    },
    {
      title: '৪-৪ Breathing',
      text: '৪ সেকেন্ড শ্বাস নাও, ৪ সেকেন্ড ছাড়ো। ১ মিনিট এভাবে চালিয়ে যাও।'
    },
    {
      title: 'নিজেকে নরমভাবে বলো',
      text: 'আজ আমার দিনটা কঠিন, কিন্তু আমি চেষ্টা করছি — এই বাক্যটি ৩ বার ধীরে পড়ো।'
    }
  ],
  resources: [
    {
      title: 'মন খুব খারাপ হলে',
      text: 'পানি খাও, বসে পড়ো, ১ মিনিট breathing tool চালাও, তারপর চাইলে আমাদের message পাঠাও।'
    },
    {
      title: 'Overthinking কমাতে',
      text: 'যা control করতে পারো আর যা পারো না — দুই ভাগে লিখে ফেলো।'
    },
    {
      title: 'একাকী লাগলে',
      text: 'কাউকে ছোট্ট একটি message দাও: তুমি কি একটু কথা বলতে পারবে?'
    }
  ]
};

async function ensureSeedContent() {
  const ref = doc(db, 'siteContent', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, defaultContent);
  }
  return ref;
}

export {
  app,
  auth,
  db,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  defaultContent,
  ensureSeedContent,
};
