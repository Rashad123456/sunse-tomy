import {
  db, collection, addDoc, doc, onSnapshot, ensureSeedContent, defaultContent
} from './firebase/config.js';

const routes = ['home', 'support', 'calm', 'journal'];
const sections = {
  home: document.getElementById('homeSection'),
  support: document.getElementById('supportSection'),
  calm: document.getElementById('calmSection'),
  journal: document.getElementById('journalSection'),
};

const mainNav = document.getElementById('mainNav');
const menuToggle = document.getElementById('menuToggle');

// Mood Map with Direct Actions
const moodMap = {
  terrible: { label: 'খুব খারাপ', suggestion: 'এখনই breathing tool ব্যবহার করো।', actionText: 'Breathing শুরু করো', action: () => { const el = document.getElementById('breathingCircle'); if(el) el.scrollIntoView({behavior: 'smooth'}); } },
  bad: { label: 'খারাপ', suggestion: 'নিচের Exercise লিস্ট থেকে grounding exercise করো।', actionText: 'Exercise দেখো', action: () => { const el = document.getElementById('exerciseList'); if(el) el.scrollIntoView({behavior: 'smooth'}); } },
  okay: { label: 'মোটামুটি', suggestion: 'একটা mind game দিয়ে মনকে শান্ত করতে পারো।', actionText: 'গেম খেলো', action: () => { const el = document.getElementById('gameGrid'); if(el) el.scrollIntoView({behavior: 'smooth'}); } },
  good: { label: 'ভালো', suggestion: 'আজকের জন্য Private Journal-এ ভালো লাগাগুলো লিখে রাখো।', actionText: 'Journal-এ লিখো', action: () => showRoute('journal') },
};

let currentContent = { ...defaultContent };
let targetIndex = Math.floor(Math.random() * 9);
let gameScore = 0;
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

// --- INTERACTIVE MODAL LOGIC (The Magic) ---
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
      setTimeout(() => {
          mText.textContent = text + '।';
          mText.style.opacity = 1;
      }, 300);
  };

  if(steps.length > 1) {
      updateTextWithFade(steps[0]);
      mAction.textContent = "পরের ধাপ";
      mAction.onclick = () => {
          stepIdx++;
          if(stepIdx < steps.length) {
              updateTextWithFade(steps[stepIdx]);
              if(stepIdx === steps.length - 1) mAction.textContent = "শেষ করো";
          } else {
              modal.classList.add('hidden');
          }
      };
  } else {
      updateTextWithFade(steps[0] || item.text);
      mAction.textContent = "বুঝতে পেরেছি";
      mAction.onclick = () => modal.classList.add('hidden');
  }
  
  mClose.onclick = () => modal.classList.add('hidden');
  modal.classList.remove('hidden');
}

// --- FIREBASE CONTENT SYNC ---
function applyContent(content) {
  currentContent = { ...defaultContent, ...content };
  
  const eBanner = document.getElementById('globalEmergencyBanner');
  const eText = document.getElementById('globalEmergencyText');
  if(eBanner && eText) {
      if(currentContent.globalEmergency) {
          eBanner.classList.remove('hidden');
          eText.textContent = currentContent.globalEmergencyText || 'জরুরি অবস্থা: অনুগ্রহ করে ৯৯৯ এ কল করুন।';
      } else {
          eBanner.classList.add('hidden');
      }
  }

  window.breathingDuration = (currentContent.breathingTime || 4) * 1000;

  const setIfFound = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };

  setIfFound('siteName', currentContent.siteName);
  setIfFound('siteTagline', currentContent.tagline);
  setIfFound('aboutText', currentContent.about);
  setIfFound('heroPrimaryButton', currentContent.heroPrimaryButton);
  setIfFound('heroSecondaryButton', currentContent.heroSecondaryButton);
  setIfFound('phoneDisplay', currentContent.phone);
  setIfFound('phoneSidebar', currentContent.phone);
  setIfFound('emergencyText', currentContent.emergencyText);
  
  const phoneLink = document.getElementById('phoneLink');
  if(phoneLink) phoneLink.href = `tel:${currentContent.phone}`;

  const img = document.getElementById('heroImage');
  if(img) img.src = currentContent.heroImage || 'assets/hero-illustration.svg';

  renderQuotes(currentContent.quotes || []);
  renderInteractiveList('exerciseList', currentContent.exercises || [], '👉 ক্লিক করে শুরু করো');
  renderInteractiveList('resourceList', currentContent.resources || [], '📖 ক্লিক করে পড়ো');
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

// --- SUPPORT FORM WITH TIMEOUT LOGIC ---
function initSupportForm() {
  const form = document.getElementById('supportForm');
  const status = document.getElementById('formStatus');
  if(!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    status.textContent = 'Sending...';
    status.classList.remove('error');
    status.style.color = '#94a3b8';
    
    try {
      const formData = new FormData(form);
      const payload = {
        name: formData.get('name') ? formData.get('name').toString().trim() : '',
        phone: formData.get('phone') ? formData.get('phone').toString().trim() : '',
        category: formData.get('category') ? formData.get('category').toString().trim() : 'Other',
        message: formData.get('message') ? formData.get('message').toString().trim() : '',
        callback: formData.get('callback') === 'on',
        status: 'new',
        createdAt: new Date()
      };

      // 8-second Timeout Logic to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Check your internet or Firebase Rules.")), 8000)
      );

      await Promise.race([
        addDoc(collection(db, 'messages'), payload),
        timeoutPromise
      ]);
      
      form.reset();
      status.textContent = 'তোমার message নেওয়া হয়েছে। আমরা সাথে আছি।';
      status.style.color = '#10b981';
      
    } catch (err) {
      console.error("Firebase Error: ", err);
      status.textContent = `Message পাঠানো যায়নি। (কারণ: ${err.message})`;
      status.classList.add('error');
      status.style.color = '#ef4444';
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
      clearInterval(breathingTimer);
      breathingTimer = null;
      startBtn.textContent = 'শুরু করো';
      return;
    }
    update();
    breathingTimer = setInterval(update, window.breathingDuration || 4000);
    startBtn.textContent = 'Pause';
  });

  if(resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearInterval(breathingTimer);
      breathingTimer = null;
      breathingStep = 0;
      circle.textContent = 'Start';
      circle.classList.remove('inhale', 'exhale');
      startBtn.textContent = 'শুরু করো';
    });
  }
}

function initGame() {
  const gameGrid = document.getElementById('gameGrid');
  const gameScoreEl = document.getElementById('gameScore');
  const gameMessage = document.getElementById('gameMessage');
  if(!gameGrid) return;
  const render = () => {
    gameGrid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = `game-cell ${i === targetIndex ? 'target' : ''}`;
      cell.addEventListener('click', () => {
        if (i === targetIndex) {
          gameScore++; gameMessage.textContent = 'দারুণ। আবার করো। ধীরে...';
          targetIndex = Math.floor(Math.random() * 9); gameScoreEl.textContent = gameScore; render();
        } else { gameMessage.textContent = 'No problem. আবার চেষ্টা করো।'; }
      });
      gameGrid.appendChild(cell);
    }
  };
  render();
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

// --- INITIALIZATION ---
wireRoutes();
if(menuToggle) menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
initContent();
initSupportForm();
initMoodButtons();
initBreathingTool();
initGame();
initJournal();
showRoute('home');