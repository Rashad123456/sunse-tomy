import {
  db,
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  ensureSeedContent,
  defaultContent,
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
const yearNow = document.getElementById('yearNow');
yearNow.textContent = new Date().getFullYear();

const moodMap = {
  terrible: {
    label: 'খুব খারাপ',
    suggestion: 'এখনই breathing tool ব্যবহার করো এবং চাইলে আমাদের কাছে message পাঠাও।',
  },
  bad: {
    label: 'খারাপ',
    suggestion: 'একটা grounding exercise করো, তারপর journal-এ লিখে ফেলো কী হচ্ছে।',
  },
  okay: {
    label: 'মোটামুটি',
    suggestion: 'একটা mind game বা calm exercise দিয়ে শুরু করতে পারো।',
  },
  good: {
    label: 'ভালো',
    suggestion: 'আজকের জন্য gratitude note লিখে রাখো।',
  },
};

let currentContent = { ...defaultContent };
let breathingTimer = null;
let breathingStep = 0;
let gameScore = 0;
let targetIndex = Math.floor(Math.random() * 9);

function showRoute(route) {
  routes.forEach((key) => {
    sections[key].classList.toggle('hidden', key !== route);
  });
  // Home-only supportive sections
  document.querySelector('.quick-actions').classList.toggle('hidden', route !== 'home');
  document.querySelector('.feature-area').classList.toggle('hidden', route !== 'home');
  document.querySelector('.quotes-area').classList.toggle('hidden', route !== 'home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  mainNav.classList.remove('open');
}

function wireRoutes() {
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.addEventListener('click', () => {
      const route = el.dataset.route;
      if (routes.includes(route)) showRoute(route);
    });
  });
}

function applyContent(content) {
  currentContent = { ...defaultContent, ...content };
  document.getElementById('siteName').textContent = currentContent.siteName;
  document.getElementById('siteTagline').textContent = currentContent.tagline;
  document.getElementById('aboutText').textContent = currentContent.about;
  document.getElementById('heroPrimaryButton').textContent = currentContent.heroPrimaryButton;
  document.getElementById('heroSecondaryButton').textContent = currentContent.heroSecondaryButton;
  document.getElementById('phoneDisplay').textContent = currentContent.phone;
  document.getElementById('phoneSidebar').textContent = currentContent.phone;
  document.getElementById('phoneLink').href = `tel:${currentContent.phone}`;
  document.getElementById('footerSiteName').textContent = currentContent.siteName;
  document.getElementById('emergencyText').textContent = currentContent.emergencyText;
  document.getElementById('heroImage').src = currentContent.heroImage || 'assets/hero-illustration.svg';

  renderQuotes(currentContent.quotes || []);
  renderExercises(currentContent.exercises || []);
  renderResources(currentContent.resources || []);
}

function renderQuotes(quotes) {
  const box = document.getElementById('quotesList');
  box.innerHTML = '';
  quotes.forEach((quote) => {
    const item = document.createElement('article');
    item.className = 'card quote-card reveal';
    item.innerHTML = `<div class="quote-mark">❝</div><p>${quote}</p>`;
    box.appendChild(item);
  });
}

function renderExercises(items) {
  const box = document.getElementById('exerciseList');
  box.innerHTML = '';
  items.forEach((item) => {
    const node = document.createElement('div');
    node.className = 'content-item';
    node.innerHTML = `<h4>${item.title}</h4><p>${item.text}</p>`;
    box.appendChild(node);
  });
}

function renderResources(items) {
  const box = document.getElementById('resourceList');
  box.innerHTML = '';
  items.forEach((item) => {
    const node = document.createElement('div');
    node.className = 'content-item';
    node.innerHTML = `<h4>${item.title}</h4><p>${item.text}</p>`;
    box.appendChild(node);
  });
}

async function initContent() {
  await ensureSeedContent();
  const ref = doc(db, 'siteContent', 'main');
  onSnapshot(ref, (snap) => {
    if (snap.exists()) applyContent(snap.data());
  }, () => {
    applyContent(defaultContent);
  });
}

function initSupportForm() {
  const form = document.getElementById('supportForm');
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Sending...';
    status.classList.remove('error');
    const formData = new FormData(form);
    const payload = {
      name: (formData.get('name') || '').toString().trim(),
      phone: (formData.get('phone') || '').toString().trim(),
      category: (formData.get('category') || '').toString().trim(),
      message: (formData.get('message') || '').toString().trim(),
      callback: formData.get('callback') === 'on',
      status: 'new',
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'messages'), payload);
      form.reset();
      status.textContent = 'তোমার message নেওয়া হয়েছে।';
    } catch (err) {
      console.error(err);
      status.textContent = 'Message পাঠানো যায়নি। Firestore rules/config check করো।';
      status.classList.add('error');
    }
  });
}

function initMoodButtons() {
  const box = document.getElementById('moodButtons');
  const out = document.getElementById('moodSuggestion');
  let active = 'okay';

  const render = () => {
    box.innerHTML = '';
    Object.entries(moodMap).forEach(([key, value]) => {
      const btn = document.createElement('button');
      btn.className = `mood-btn ${active === key ? 'active' : ''}`;
      btn.textContent = value.label;
      btn.addEventListener('click', () => {
        active = key;
        render();
      });
      box.appendChild(btn);
    });
    out.innerHTML = `<strong>Suggestion:</strong> ${moodMap[active].suggestion}`;
  };
  render();
}

function initBreathingTool() {
  const circle = document.getElementById('breathingCircle');
  const startBtn = document.getElementById('startBreathing');
  const resetBtn = document.getElementById('resetBreathing');

  const update = () => {
    const inhale = breathingStep < 4;
    circle.textContent = inhale ? 'Inhale' : 'Exhale';
    circle.classList.toggle('inhale', inhale);
    circle.classList.toggle('exhale', !inhale);
    breathingStep = (breathingStep + 1) % 8;
  };

  startBtn.addEventListener('click', () => {
    if (breathingTimer) {
      clearInterval(breathingTimer);
      breathingTimer = null;
      startBtn.textContent = 'Start';
      return;
    }
    update();
    breathingTimer = setInterval(update, 1000);
    startBtn.textContent = 'Pause';
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(breathingTimer);
    breathingTimer = null;
    breathingStep = 0;
    circle.textContent = 'Start';
    circle.classList.remove('inhale', 'exhale');
    startBtn.textContent = 'Start';
  });
}

function initGame() {
  const gameGrid = document.getElementById('gameGrid');
  const gameScoreEl = document.getElementById('gameScore');
  const gameMessage = document.getElementById('gameMessage');

  const render = () => {
    gameGrid.innerHTML = '';
    for (let i = 0; i < 9; i += 1) {
      const cell = document.createElement('button');
      cell.className = `game-cell ${i === targetIndex ? 'target' : ''}`;
      cell.addEventListener('click', () => {
        if (i === targetIndex) {
          gameScore += 1;
          gameMessage.textContent = 'দারুণ। আবার করো। ধীরে, মনোযোগ দিয়ে।';
          targetIndex = Math.floor(Math.random() * 9);
          gameScoreEl.textContent = gameScore;
          render();
        } else {
          gameMessage.textContent = 'No problem. আবার ধীরে চেষ্টা করো।';
        }
      });
      gameGrid.appendChild(cell);
    }
  };
  render();
}

function initJournal() {
  const input = document.getElementById('journalInput');
  const btn = document.getElementById('saveJournal');
  const status = document.getElementById('journalStatus');
  const key = 'shunchi_tomay_journal_v2';
  input.value = localStorage.getItem(key) || '';
  btn.addEventListener('click', () => {
    localStorage.setItem(key, input.value);
    status.textContent = 'Saved in this browser.';
    status.classList.remove('error');
  });
}

function initMenu() {
  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });
}

wireRoutes();
initMenu();
initMoodButtons();
initBreathingTool();
initGame();
initSupportForm();
initJournal();
initContent();
showRoute('home');
