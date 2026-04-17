import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  defaultContent,
  ensureSeedContent,
} from './firebase/config.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('adminLoginForm');
const loginStatus = document.getElementById('loginStatus');
const contentForm = document.getElementById('contentForm');
const contentStatus = document.getElementById('contentStatus');
const quickStatus = document.getElementById('quickStatus');

let contentState = { ...defaultContent };
let messagesCache = [];

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
}

function showLogin() {
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

function fillContentForm(data) {
  document.getElementById('siteNameInput').value = data.siteName || '';
  document.getElementById('phoneInput').value = data.phone || '';
  document.getElementById('taglineInput').value = data.tagline || '';
  document.getElementById('heroPrimaryInput').value = data.heroPrimaryButton || '';
  document.getElementById('heroSecondaryInput').value = data.heroSecondaryButton || '';
  document.getElementById('heroImageInput').value = data.heroImage || '';
  document.getElementById('aboutInput').value = data.about || '';
  document.getElementById('emergencyInput').value = data.emergencyText || '';
}

function renderStats() {
  document.getElementById('totalMessages').textContent = messagesCache.length;
  document.getElementById('callbackMessages').textContent = messagesCache.filter((m) => m.callback).length;
  document.getElementById('latestCategory').textContent = messagesCache[0]?.category || '-';
}

function renderMessages() {
  const box = document.getElementById('adminMessagesList');
  box.innerHTML = '';
  if (!messagesCache.length) {
    box.innerHTML = '<div class="admin-item"><p>No messages yet.</p></div>';
    return;
  }

  messagesCache.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'admin-item message-card';
    const created = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Just now';
    card.innerHTML = `
      <div class="message-meta">
        <span class="badge-inline">${item.category || 'Other'}</span>
        ${item.callback ? '<span class="badge-inline">Callback</span>' : ''}
        <span class="badge-inline">${created}</span>
      </div>
      <h4>${item.name || 'Anonymous'}</h4>
      <p>${item.phone || 'No phone provided'}</p>
      <p class="message-text">${item.message || ''}</p>
      <div class="row-actions top-gap">
        <button class="tiny-btn" data-action="mark" data-id="${item.id}">Mark Reviewed</button>
        <button class="tiny-btn delete" data-action="delete-message" data-id="${item.id}">Delete</button>
      </div>
    `;
    box.appendChild(card);
  });

  box.querySelectorAll('[data-action="mark"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'messages', btn.dataset.id), { status: 'reviewed' });
    });
  });

  box.querySelectorAll('[data-action="delete-message"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('এই message delete করতে চাও?')) {
        await deleteDoc(doc(db, 'messages', btn.dataset.id));
      }
    });
  });
}

function renderSimpleList(boxId, items, key) {
  const box = document.getElementById(boxId);
  box.innerHTML = '';
  items.forEach((item, index) => {
    const node = document.createElement('div');
    node.className = 'admin-item';
    node.innerHTML = `
      <p>${typeof item === 'string' ? item : `<strong>${item.title}</strong><br>${item.text}`}</p>
      <div class="row-actions">
        <button class="tiny-btn delete" data-key="${key}" data-index="${index}">Delete</button>
      </div>
    `;
    box.appendChild(node);
  });

  box.querySelectorAll('.delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const arr = [...contentState[btn.dataset.key]];
      arr.splice(Number(btn.dataset.index), 1);
      contentState[btn.dataset.key] = arr;
      await saveContent();
    });
  });
}

function renderAllLists() {
  renderSimpleList('adminQuotesList', contentState.quotes || [], 'quotes');
  renderSimpleList('adminExercisesList', contentState.exercises || [], 'exercises');
  renderSimpleList('adminResourcesList', contentState.resources || [], 'resources');
}

async function saveContent() {
  await setDoc(doc(db, 'siteContent', 'main'), contentState, { merge: true });
  fillContentForm(contentState);
  renderAllLists();
}

async function initContentWatcher() {
  await ensureSeedContent();
  onSnapshot(doc(db, 'siteContent', 'main'), (snap) => {
    contentState = { ...defaultContent, ...(snap.exists() ? snap.data() : {}) };
    fillContentForm(contentState);
    renderAllLists();
  });
}

function initMessagesWatcher() {
  const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    messagesCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderStats();
    renderMessages();
  }, () => {
    messagesCache = [];
    renderStats();
    renderMessages();
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(loginStatus, 'Logging in...');
  try {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    await signInWithEmailAndPassword(auth, email, password);
    setStatus(loginStatus, 'Login successful.');
  } catch (err) {
    console.error(err);
    setStatus(loginStatus, 'Login failed. Email/password check করো।', true);
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

contentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  contentState = {
    ...contentState,
    siteName: document.getElementById('siteNameInput').value.trim(),
    phone: document.getElementById('phoneInput').value.trim(),
    tagline: document.getElementById('taglineInput').value.trim(),
    heroPrimaryButton: document.getElementById('heroPrimaryInput').value.trim(),
    heroSecondaryButton: document.getElementById('heroSecondaryInput').value.trim(),
    heroImage: document.getElementById('heroImageInput').value.trim(),
    about: document.getElementById('aboutInput').value.trim(),
    emergencyText: document.getElementById('emergencyInput').value.trim(),
  };
  try {
    await saveContent();
    setStatus(contentStatus, 'Site content saved.');
  } catch (err) {
    console.error(err);
    setStatus(contentStatus, 'Save failed. Firestore rules check করো।', true);
  }
});

document.getElementById('addQuoteBtn').addEventListener('click', async () => {
  const input = document.getElementById('quoteInput');
  if (!input.value.trim()) return;
  contentState.quotes = [...(contentState.quotes || []), input.value.trim()];
  await saveContent();
  input.value = '';
  setStatus(quickStatus, 'Quote added.');
});

document.getElementById('addExerciseBtn').addEventListener('click', async () => {
  const title = document.getElementById('exerciseTitle');
  const text = document.getElementById('exerciseText');
  if (!title.value.trim() || !text.value.trim()) return;
  contentState.exercises = [...(contentState.exercises || []), { title: title.value.trim(), text: text.value.trim() }];
  await saveContent();
  title.value = '';
  text.value = '';
  setStatus(quickStatus, 'Exercise added.');
});

document.getElementById('addResourceBtn').addEventListener('click', async () => {
  const title = document.getElementById('resourceTitle');
  const text = document.getElementById('resourceText');
  if (!title.value.trim() || !text.value.trim()) return;
  contentState.resources = [...(contentState.resources || []), { title: title.value.trim(), text: text.value.trim() }];
  await saveContent();
  title.value = '';
  text.value = '';
  setStatus(quickStatus, 'Resource added.');
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLogin();
    return;
  }
  showDashboard();
  await initContentWatcher();
  initMessagesWatcher();
});
