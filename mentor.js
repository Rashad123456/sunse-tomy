// শুধু auth এবং db তোমার config ফাইল থেকে আসবে
import { auth, db } from './firebase/config.js';

// বাকি সব সরাসরি ফায়ারবেসের সার্ভার থেকে আসবে (ক্র্যাশ করার আর কোনো উপায় নেই!)
import { doc, updateDoc, collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const incomingCallBox = document.getElementById('incomingCallBox');
const loginErrorText = document.getElementById('loginError');

let ringtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
ringtone.loop = true;

// 1. Advanced Login Logic (Error Debugger)
document.getElementById('mentorLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  loginErrorText.textContent = 'অপেক্ষা করুন, লগ-ইন হচ্ছে...';
  loginErrorText.style.color = '#3b82f6';

  const email = document.getElementById('mentorEmail').value;
  const password = document.getElementById('mentorPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginErrorText.textContent = '✅ লগ-ইন সফল!';
    loginErrorText.style.color = '#10b981';
  } catch (err) { 
    console.error("Firebase Error: ", err);
    loginErrorText.textContent = `❌ Error: ${err.message}`; 
    loginErrorText.style.color = "#ef4444"; 
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add('hidden'); dashboardSection.classList.remove('hidden');
    
    // Live Ringing Listener
    const callQuery = query(collection(db, 'live_calls'), where('status', '==', 'ringing'));
    onSnapshot(callQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const callId = change.doc.id;
          const callData = change.doc.data();
          ringtone.play().catch(e => console.log("Autoplay blocked"));
          
          incomingCallBox.style.background = 'rgba(239, 68, 68, 0.1)';
          incomingCallBox.style.borderColor = '#ef4444';
          incomingCallBox.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 10px; animation: pulse 1s infinite;">🔔</div>
            <h3 style="color: #ef4444;">Incoming Call from ${callData.user}</h3>
            <button id="acceptCall" class="btn" style="background: #10b981; margin-right: 10px;">✅ Accept</button>
            <button id="rejectCall" class="btn" style="background: #ef4444;">❌ Reject</button>
          `;

          document.getElementById('acceptCall').onclick = async () => {
            ringtone.pause(); ringtone.currentTime = 0;
            await updateDoc(doc(db, 'live_calls', callId), { status: 'accepted', mentor: user.email });
            incomingCallBox.innerHTML = `<h3 style="color: #10b981;">🟢 Call Connected!</h3>`;
            
            // মেন্টরকে ভিডিও পেজে নিয়ে যাওয়া
            setTimeout(() => {
                window.open(`video_call.html?roomID=${callId}&name=Mentor`, '_blank');
                incomingCallBox.style.background = 'rgba(59,130,246,0.05)';
                incomingCallBox.style.borderColor = '#3b82f6';
                incomingCallBox.innerHTML = `<div style="font-size: 3rem;">🎧</div><p>অপেক্ষা করা হচ্ছে...</p>`;
            }, 1000);
          };

          document.getElementById('rejectCall').onclick = async () => {
            ringtone.pause(); ringtone.currentTime = 0;
            await updateDoc(doc(db, 'live_calls', callId), { status: 'rejected' });
            incomingCallBox.style.background = 'rgba(59,130,246,0.05)';
            incomingCallBox.style.borderColor = '#3b82f6';
            incomingCallBox.innerHTML = `<div style="font-size: 3rem;">🎧</div><p>অপেক্ষা করা হচ্ছে...</p>`;
          };
        }
      });
    });

  } else {
    loginSection.classList.remove('hidden'); dashboardSection.classList.add('hidden');
  }
});