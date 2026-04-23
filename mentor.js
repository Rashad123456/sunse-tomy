import { auth, db } from './firebase/config.js';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const incomingCallBox = document.getElementById('incomingCallBox');
const loginErrorText = document.getElementById('loginError');

let ringtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
ringtone.loop = true;
let currentCallId = null; 

document.getElementById('mentorLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErrorText.textContent = 'অপেক্ষা করুন...';
  try {
    await signInWithEmailAndPassword(auth, document.getElementById('mentorEmail').value, document.getElementById('mentorPassword').value);
  } catch (err) { loginErrorText.textContent = `❌ Error: ${err.message}`; }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add('hidden'); dashboardSection.classList.remove('hidden');
    
    const callQuery = query(collection(db, 'live_calls'), where('status', '==', 'ringing'));
    onSnapshot(callQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const callId = change.doc.id;
          const callData = change.doc.data();
          ringtone.play().catch(e => console.log("Autoplay blocked"));
          
          incomingCallBox.style.background = 'rgba(239, 68, 68, 0.1)';
          incomingCallBox.style.borderColor = '#ef4444';
          
          // 🖼️ যদি ইউজার ছবি পাঠিয়ে থাকে, তবে সেটা মেন্টরকে দেখানো হবে
          let imageHtml = callData.attachedImage ? `<img src="${callData.attachedImage}" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; margin-bottom: 15px; border: 1px solid #3b82f6;" />` : '';

          incomingCallBox.innerHTML = `
            ${imageHtml}
            <div style="font-size: 3rem; margin-bottom: 10px; animation: pulse 1s infinite;">🔔</div>
            <h3 style="color: #ef4444;">Incoming Call from ${callData.user}</h3>
            <button id="acceptCall" class="btn" style="background: #10b981; margin-right: 10px;">✅ Accept</button>
            <button id="rejectCall" class="btn" style="background: #ef4444;">❌ Reject</button>
          `;

          // ✅ কল রিসিভ করার লজিক
          document.getElementById('acceptCall').onclick = async () => {
            ringtone.pause(); ringtone.currentTime = 0;
            currentCallId = callId;
            document.getElementById('adviceUserId').value = callData.user || "Anonymous";

            await updateDoc(doc(db, 'live_calls', callId), { status: 'accepted', mentor: user.email });
            incomingCallBox.innerHTML = `<h3 style="color: #10b981;">🟢 Call Connected!</h3>`;
            
            setTimeout(() => {
                // ভিডিও কল উইন্ডো ওপেন করা
                let videoWin = window.open(`video_call.html?roomID=${callId}&name=Mentor`, '_blank');
                
                incomingCallBox.style.background = 'rgba(59,130,246,0.05)';
                incomingCallBox.style.borderColor = '#3b82f6';
                incomingCallBox.innerHTML = `<div style="font-size: 3rem;">🎧</div><p>অপেক্ষা করা হচ্ছে...</p>`;

                // 🌟 ম্যাজিক: ভিডিও কল কাটা হলে পরামর্শ বক্সে অটোমেটিক ফোকাস করা
                let checkWin = setInterval(() => {
                    if (videoWin && videoWin.closed) {
                        clearInterval(checkWin);
                        alert("সেশন শেষ হয়েছে! দয়া করে ইউজারের জন্য পরামর্শ লিখে সেভ করুন।");
                        
                        const adviceInput = document.getElementById('adviceText');
                        adviceInput.focus(); // কার্সার অটোমেটিক বক্সে চলে যাবে
                        adviceInput.style.border = "2px solid #10b981"; // বক্সে সুন্দর সবুজ বর্ডার আসবে
                        adviceInput.style.boxShadow = "0 0 15px rgba(16,185,129,0.5)"; // গ্লোয়িং ইফেক্ট
                    }
                }, 1000);

            }, 1000);
          };

          // ❌ কল রিজেক্ট করার লজিক
          document.getElementById('rejectCall').onclick = async () => {
            ringtone.pause(); ringtone.currentTime = 0;
            await updateDoc(doc(db, 'live_calls', callId), { status: 'rejected' });
            incomingCallBox.innerHTML = `<div style="font-size: 3rem;">🎧</div><p>অপেক্ষা করা হচ্ছে...</p>`;
          };
        }
      });
    });

  } else {
    loginSection.classList.remove('hidden'); dashboardSection.classList.add('hidden');
  }
});

// প্রেসক্রিপশন সেভ করার লজিক
document.getElementById('saveAdviceBtn').addEventListener('click', async () => {
    const adviceText = document.getElementById('adviceText').value;

    if(!currentCallId) { alert("⚠️ আগে একটি কল রিসিভ করুন!"); return; }
    if(!adviceText) { alert("⚠️ দয়া করে বক্সে পরামর্শ লিখুন!"); return; }

    try {
        await updateDoc(doc(db, 'live_calls', currentCallId), {
            status: 'completed',
            prescription: adviceText
        });

        alert("✅ ইউজারের কাছে সফলভাবে পরামর্শ পাঠানো হয়েছে!");
        
        // বক্সগুলো আবার নরমাল করে দেওয়া
        const adviceInput = document.getElementById('adviceText');
        adviceInput.value = ''; 
        adviceInput.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        adviceInput.style.boxShadow = "none";
        
        document.getElementById('adviceUserId').value = '';
        currentCallId = null; 
    } catch (error) {
        alert("❌ পরামর্শ পাঠাতে সমস্যা হয়েছে!");
    }
});