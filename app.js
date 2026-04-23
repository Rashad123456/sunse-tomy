import { db, collection, addDoc, doc, onSnapshot, ensureSeedContent, defaultContent } from './firebase/config.js';

const routes = ['home', 'support', 'calm', 'journal'];
const sections = {
  home: document.getElementById('homeSection'),
  support: document.getElementById('supportSection'),
  calm: document.getElementById('calmSection'),
  journal: document.getElementById('journalSection'),
};

const mainNav = document.getElementById('mainNav');
const menuToggle = document.getElementById('menuToggle');

const moodMap = {
  terrible: { label: 'খুব খারাপ', suggestion: 'এখনই breathing tool ব্যবহার করো।', actionText: 'Breathing শুরু করো', action: () => { const el = document.getElementById('breathingCircle'); if(el) el.scrollIntoView({behavior: 'smooth'}); } },
  bad: { label: 'খারাপ', suggestion: 'নিচের Exercise লিস্ট থেকে grounding exercise করো।', actionText: 'Exercise দেখো', action: () => { const el = document.getElementById('exerciseList'); if(el) el.scrollIntoView({behavior: 'smooth'}); } },
  okay: { label: 'মোটামুটি', suggestion: 'একটা mind game দিয়ে মনকে শান্ত করতে পারো।', actionText: 'গেম খেলো', action: () => { const el = document.getElementById('homeSection'); if(el) el.scrollIntoView({behavior: 'smooth'}); } },
  good: { label: 'ভালো', suggestion: 'আজকের জন্য Private Journal-এ ভালো লাগাগুলো লিখে রাখো।', actionText: 'Journal-এ লিখো', action: () => showRoute('journal') },
};

let currentContent = { ...defaultContent };
let breathingTimer = null;
let breathingStep = 0;

function showRoute(route) {
  routes.forEach((key) => { if(sections[key]) sections[key].classList.toggle('hidden', key !== route); });
  const quotesArea = document.querySelector('.quotes-area');
  if(quotesArea) quotesArea.classList.toggle('hidden', route !== 'home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if(mainNav) mainNav.classList.remove('open');
}

function wireRoutes() {
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.addEventListener('click', () => {
      const route = el.dataset.route;
      if (routes.includes(route)) showRoute(route);
    });
  });
}

function openInteractiveModal(item) {
  const modal = document.getElementById('interactiveModal');
  const mTitle = document.getElementById('modalTitle');
  const mText = document.getElementById('modalText');
  const mAction = document.getElementById('modalActionBtn');
  const mClose = document.getElementById('modalCloseBtn');
  if(!modal) return;

  mTitle.textContent = item.title;
  let steps = item.text.split('।').filter(s => s.trim().length > 0);
  let stepIdx = 0;
  
  const updateTextWithFade = (text) => {
      mText.style.opacity = 0;
      setTimeout(() => { mText.textContent = text + '।'; mText.style.opacity = 1; }, 300);
  };

  if(steps.length > 1) {
      updateTextWithFade(steps[0]);
      mAction.textContent = "পরের ধাপ";
      mAction.onclick = () => {
          stepIdx++;
          if(stepIdx < steps.length) {
              updateTextWithFade(steps[stepIdx]);
              if(stepIdx === steps.length - 1) mAction.textContent = "শেষ করো";
          } else { modal.classList.add('hidden'); }
      };
  } else {
      updateTextWithFade(steps[0] || item.text);
      mAction.textContent = "বুঝতে পেরেছি";
      mAction.onclick = () => modal.classList.add('hidden');
  }
  mClose.onclick = () => modal.classList.add('hidden');
  modal.classList.remove('hidden');
}

function applyContent(content) {
  currentContent = { ...defaultContent, ...content };
  window.breathingDuration = (currentContent.breathingTime || 4) * 1000;

  const setIfFound = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
  setIfFound('siteName', currentContent.siteName);
  setIfFound('siteTagline', currentContent.tagline);
  setIfFound('aboutText', currentContent.about);
  setIfFound('heroPrimaryButton', currentContent.heroPrimaryButton);
  setIfFound('heroSecondaryButton', currentContent.heroSecondaryButton);
  setIfFound('phoneDisplay', currentContent.phone);
  
  const phoneLink = document.getElementById('phoneLink');
  if(phoneLink) phoneLink.href = `tel:${currentContent.phone}`;

  renderQuotes(currentContent.quotes || []);
  renderInteractiveList('exerciseList', currentContent.exercises || [], '👉 ক্লিক করে শুরু করো');
  renderInteractiveList('resourceList', currentContent.resources || [], '📖 ক্লিক করে পড়ো');
}

function renderQuotes(quotes) {
  const box = document.getElementById('quotesList');
  if(!box) return;
  box.innerHTML = '';
  quotes.forEach((quote) => {
    const item = document.createElement('article');
    item.className = 'card quote-card reveal';
    item.innerHTML = `<div class="quote-mark">❝</div><p>${quote}</p>`;
    box.appendChild(item);
  });
}

function renderInteractiveList(id, items, hint) {
  const box = document.getElementById(id);
  if(!box) return;
  box.innerHTML = '';
  items.forEach(item => {
    const node = document.createElement('div');
    node.className = 'content-item interactive-item';
    node.innerHTML = `<h4>${item.title}</h4><p class="hint-text">${hint}</p>`;
    node.addEventListener('click', () => openInteractiveModal(item));
    box.appendChild(node);
  });
}

async function initContent() {
  applyContent(defaultContent); 
  try { await ensureSeedContent(); } catch (err) {}
  onSnapshot(doc(db, 'siteContent', 'main'), (snap) => {
    if (snap.exists()) applyContent(snap.data());
  });
}

function initSupportForm() {
  const form = document.getElementById('supportForm');
  const status = document.getElementById('formStatus');
  if(!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Sending...'; status.classList.remove('error'); status.style.color = '#94a3b8';
    try {
      const formData = new FormData(form);
      const payload = {
        name: formData.get('name') ? formData.get('name').toString().trim() : '',
        phone: formData.get('phone') ? formData.get('phone').toString().trim() : '',
        category: formData.get('category') ? formData.get('category').toString().trim() : 'Other',
        message: formData.get('message') ? formData.get('message').toString().trim() : '',
        callback: formData.get('callback') === 'on',
        status: 'new', createdAt: new Date()
      };
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), 8000));
      await Promise.race([ addDoc(collection(db, 'messages'), payload), timeoutPromise ]);
      
      form.reset();
      status.textContent = 'তোমার message নেওয়া হয়েছে। আমরা সাথে আছি।'; status.style.color = '#10b981';
    } catch (err) {
      status.textContent = `Message পাঠানো যায়নি। (কারণ: ${err.message})`; status.classList.add('error'); status.style.color = '#ef4444';
    }
  });
}

function initMoodButtons() {
  const box = document.getElementById('moodButtons');
  const out = document.getElementById('moodSuggestion');
  if(!box || !out) return;
  let active = 'okay';
  const render = () => {
    box.innerHTML = '';
    Object.entries(moodMap).forEach(([key, value]) => {
      const btn = document.createElement('button');
      btn.className = `mood-btn ${active === key ? 'active' : ''}`;
      btn.textContent = value.label;
      btn.addEventListener('click', () => { active = key; render(); });
      box.appendChild(btn);
    });
    out.innerHTML = `<strong>Suggestion:</strong> ${moodMap[active].suggestion}<br><br><button class="btn btn-primary small action-btn">${moodMap[active].actionText}</button>`;
    out.querySelector('.action-btn').addEventListener('click', moodMap[active].action);
  };
  render();
}

function initBreathingTool() {
  const circle = document.getElementById('breathingCircle');
  const startBtn = document.getElementById('startBreathing');
  const resetBtn = document.getElementById('resetBreathing');
  if(!circle || !startBtn) return;

  const update = () => {
    const inhale = breathingStep < 4;
    circle.textContent = inhale ? 'Inhale' : 'Exhale';
    circle.classList.toggle('inhale', inhale);
    circle.classList.toggle('exhale', !inhale);
    const durationSec = (window.breathingDuration || 4000) / 1000;
    circle.style.transition = `transform ${durationSec}s ease, box-shadow ${durationSec}s ease, background ${durationSec}s ease`;
    breathingStep = (breathingStep + 1) % 8;
  };

  startBtn.addEventListener('click', () => {
    if (breathingTimer) {
      clearInterval(breathingTimer); breathingTimer = null; startBtn.textContent = 'শুরু করো'; return;
    }
    update();
    breathingTimer = setInterval(update, window.breathingDuration || 4000);
    startBtn.textContent = 'Pause';
  });

  if(resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearInterval(breathingTimer); breathingTimer = null; breathingStep = 0;
      circle.textContent = 'Start'; circle.classList.remove('inhale', 'exhale'); startBtn.textContent = 'শুরু করো';
    });
  }
}

function initJournal() {
  const jInput = document.getElementById('journalInput');
  const jBtn = document.getElementById('saveJournal');
  if(jInput && jBtn) {
    jInput.value = localStorage.getItem('shunchi_journal') || '';
    jBtn.addEventListener('click', () => {
      localStorage.setItem('shunchi_journal', jInput.value);
      const statusText = document.getElementById('journalStatus');
      if(statusText) statusText.textContent = 'Saved privately in your browser.';
    });
  }
}

function initNewFeatures() {
  const sosBtn = document.getElementById('sosButton');
  const sosOverlay = document.getElementById('sosOverlay');
  const closeSos = document.getElementById('closeSos');
  if(sosBtn && sosOverlay && closeSos) {
    sosBtn.addEventListener('click', (e) => { e.preventDefault(); sosOverlay.classList.remove('hidden'); });
    closeSos.addEventListener('click', () => sosOverlay.classList.add('hidden'));
  }

  const burnBtn = document.getElementById('burnBtn');
  const burnText = document.getElementById('burnText');
  if(burnBtn && burnText) {
    burnBtn.addEventListener('click', () => {
      if(!burnText.value.trim()) return;
      burnText.classList.add('burning');
      burnBtn.disabled = true; burnBtn.textContent = '🔥 পুড়ছে...';
      setTimeout(() => {
        burnText.value = ''; burnText.classList.remove('burning');
        burnBtn.disabled = false; burnBtn.textContent = '🔥 পুড়িয়ে ফেলো';
      }, 1500);
    });
  }

  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });
}

// 🌟 তোমার আপডেটেড লাইভ কল এবং ইমেজ আপলোড লজিক
function initLiveCall() {
  const liveCallBtn = document.getElementById('liveCallBtn');
  const callStatusText = document.getElementById('callStatusText');
  const fileInput = document.getElementById('callImageInput'); 
  
  if(!liveCallBtn) return;

  liveCallBtn.addEventListener('click', async () => {
    liveCallBtn.classList.add('hidden'); 
    callStatusText.classList.remove('hidden');
    callStatusText.innerHTML = 'কলিং (রিং হচ্ছে)... 🔔'; 
    callStatusText.style.color = '#3b82f6';

    const initiateCall = async (base64Image) => {
        try {
          const callRef = await addDoc(collection(db, 'live_calls'), { 
              user: 'User_' + Math.floor(Math.random() * 1000), 
              status: 'ringing', 
              attachedImage: base64Image, 
              createdAt: new Date() 
          });
          
          onSnapshot(doc(db, 'live_calls', callRef.id), (snap) => {
            const data = snap.data();
            if(!data) return;

            if(data.status === 'accepted') {
              callStatusText.innerHTML = "🟢 কল চলছে... <br> <span style='color: #f59e0b; font-size: 0.9rem; margin-top: 5px; display: block;'>সেশন শেষে মেন্টরের পরামর্শের জন্য অপেক্ষা করুন (Pending...) ⏳</span>";
              window.open(`video_call.html?roomID=${callRef.id}&name=User`, '_blank');
              
            } else if(data.status === 'rejected') {
              callStatusText.innerHTML = '❌ মেন্টর ব্যস্ত আছেন। একটু পর আবার চেষ্টা করুন।'; 
              callStatusText.style.color = '#ef4444';
              setTimeout(() => { liveCallBtn.classList.remove('hidden'); callStatusText.classList.add('hidden'); }, 5000);
              
            } else if (data.status === 'completed' && data.prescription) {
              // ✅ মেন্টরের পরামর্শ ইউজারের স্ক্রিনে আলাদা বক্সে শো করানো
              callStatusText.innerHTML = "✅ সেশন শেষ! নিচে মেন্টরের পরামর্শ দেখুন।";
              callStatusText.style.color = '#10b981';
              
              const pBox = document.getElementById('myPrescriptionBox');
              const pText = document.getElementById('myPrescriptionText');
              if(pBox && pText) {
                  pBox.classList.remove('hidden');
                  pText.textContent = data.prescription;
                  pBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); // অটোমেটিক স্ক্রল করে বক্সে নিয়ে যাবে
              }
            }
          });
        } catch(err) { 
            callStatusText.textContent = 'নেটওয়ার্ক এরর!'; 
            callStatusText.style.color = '#ef4444'; 
        }
    };

    if (fileInput && fileInput.files.length > 0) {
        callStatusText.innerHTML = 'ছবি আপলোড হচ্ছে... ⏳';
        const reader = new FileReader();
        reader.onloadend = () => { initiateCall(reader.result); }; 
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        initiateCall(null); 
    }
  });
}

// --- INITIALIZATION (সব ফিচার চালু করার জন্য) ---
wireRoutes();
if(menuToggle) menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
initContent();
initSupportForm();
initMoodButtons();
initBreathingTool();
initJournal();
initNewFeatures();
initLiveCall();
showRoute('home');