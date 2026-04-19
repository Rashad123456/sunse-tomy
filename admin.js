import {
  auth, db, doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, query, orderBy, defaultContent, ensureSeedContent
} from './firebase/config.js';
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const logoutBtn = document.getElementById('logoutBtn');
let contentState = { ...defaultContent };
let messagesCache = [];

function setStatus(el, message, isError = false) { 
  el.textContent = message; 
  el.className = `status-text ${isError ? 'error' : ''}`; 
  setTimeout(() => el.textContent='', 3000); 
}

// Login & Auth
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(document.getElementById('loginStatus'), 'Logging in...');
  try {
    await signInWithEmailAndPassword(auth, document.getElementById('adminEmail').value, document.getElementById('adminPassword').value);
  } catch (err) { setStatus(document.getElementById('loginStatus'), 'Access Denied. Check Email/Password.', true); }
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) { loginSection.classList.remove('hidden'); dashboardSection.classList.add('hidden'); logoutBtn.classList.add('hidden'); return; }
  loginSection.classList.add('hidden'); dashboardSection.classList.remove('hidden'); logoutBtn.classList.remove('hidden');
  await initContentWatcher(); 
  initMessagesWatcher();
});

// Analytics & Messages
function renderStats() {
  document.getElementById('totalMessages').textContent = messagesCache.length;
  document.getElementById('criticalMessages').textContent = messagesCache.filter(m => m.category === 'Depression' || m.category === 'Anxiety').length;
  document.getElementById('callbackMessages').textContent = messagesCache.filter(m => m.callback).length;
}

function renderMessages() {
  const box = document.getElementById('adminMessagesList'); box.innerHTML = '';
  if (!messagesCache.length) { box.innerHTML = '<p class="text-muted">No messages yet.</p>'; return; }

  messagesCache.forEach((item) => {
    const card = document.createElement('div');
    card.className = `admin-item message-card ${item.status === 'critical' ? 'critical-border' : ''}`;
    card.style.border = item.status === 'critical' ? '1px solid #ef4444' : '';
    const created = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Just now';
    
    card.innerHTML = `
      <div class="message-meta">
        <span class="badge-inline">${item.category || 'Other'}</span>
        ${item.callback ? '<span class="badge-inline" style="background:#ef4444; color:white;">Callback Needed</span>' : ''}
        ${item.status === 'reviewed' ? '<span class="badge-inline" style="background:#10b981; color:white;">Reviewed</span>' : ''}
      </div>
      <h4 style="margin-bottom: 4px;">${item.name || 'Anonymous'}</h4>
      <p style="font-size:0.85rem;">📞 ${item.phone || 'No phone'} | 🕒 ${created}</p>
      <p class="message-text" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">${item.message}</p>
      
      <div class="admin-note-section top-gap">
        <textarea id="note-${item.id}" class="admin-note-input" rows="2" placeholder="Private Admin Note...">${item.adminNote || ''}</textarea>
        <div class="row-actions top-gap">
          <button class="tiny-btn" data-action="save-note" data-id="${item.id}">Save Note</button>
          <button class="tiny-btn" style="color: #ef4444;" data-action="mark-critical" data-id="${item.id}">Mark Critical</button>
          <button class="tiny-btn" style="color: #10b981;" data-action="mark-done" data-id="${item.id}">Mark Done</button>
          <button class="tiny-btn delete" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
    box.appendChild(card);
  });

  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const ref = doc(db, 'messages', id);
      if(btn.dataset.action === 'save-note') await updateDoc(ref, { adminNote: document.getElementById(`note-${id}`).value });
      if(btn.dataset.action === 'mark-critical') await updateDoc(ref, { status: 'critical' });
      if(btn.dataset.action === 'mark-done') await updateDoc(ref, { status: 'reviewed' });
      if(btn.dataset.action === 'delete' && confirm('Are you sure you want to delete this message?')) await deleteDoc(ref);
    });
  });
}

function initMessagesWatcher() {
  onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc')), (snap) => {
    messagesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStats(); renderMessages();
  });
}

// Data Saving Helper
async function saveContent() { 
  await setDoc(doc(db, 'siteContent', 'main'), contentState, { merge: true }); 
}

function fillContentForm() {
  document.getElementById('siteNameInput').value = contentState.siteName || '';
  document.getElementById('phoneInput').value = contentState.phone || '';
  document.getElementById('taglineInput').value = contentState.tagline || '';
  document.getElementById('heroPrimaryInput').value = contentState.heroPrimaryButton || '';
  document.getElementById('heroSecondaryInput').value = contentState.heroSecondaryButton || '';
  document.getElementById('emergencyInput').value = contentState.emergencyText || '';
  
  // Supreme Controllers
  document.getElementById('globalEmergencyCheck').checked = contentState.globalEmergency || false;
  document.getElementById('globalEmergencyTextInput').value = contentState.globalEmergencyText || '';
  document.getElementById('breathingTimeInput').value = contentState.breathingTime || 4;
}

async function initContentWatcher() {
  await ensureSeedContent();
  onSnapshot(doc(db, 'siteContent', 'main'), (snap) => {
    contentState = { ...defaultContent, ...(snap.exists() ? snap.data() : {}) };
    fillContentForm();
    renderSimpleList('adminQuotesList', contentState.quotes || [], 'quotes');
    renderSimpleList('adminExercisesList', contentState.exercises || [], 'exercises');
    renderSimpleList('adminResourcesList', contentState.resources || [], 'resources');
  });
}

// Core Settings Forms
document.getElementById('emergencyToggleForm').addEventListener('submit', async(e) => {
  e.preventDefault();
  contentState.globalEmergency = document.getElementById('globalEmergencyCheck').checked;
  contentState.globalEmergencyText = document.getElementById('globalEmergencyTextInput').value.trim();
  await saveContent();
  setStatus(document.getElementById('emergencyStatus'), 'Emergency State Updated!');
});

document.getElementById('toolControllerForm').addEventListener('submit', async(e) => {
  e.preventDefault();
  contentState.breathingTime = parseInt(document.getElementById('breathingTimeInput').value) || 4;
  await saveContent();
  setStatus(document.getElementById('toolStatus'), 'Tool Settings Updated!');
});

document.getElementById('contentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  contentState.siteName = document.getElementById('siteNameInput').value;
  contentState.phone = document.getElementById('phoneInput').value;
  contentState.tagline = document.getElementById('taglineInput').value;
  contentState.heroPrimaryButton = document.getElementById('heroPrimaryInput').value;
  contentState.heroSecondaryButton = document.getElementById('heroSecondaryInput').value;
  contentState.emergencyText = document.getElementById('emergencyInput').value;
  await saveContent();
  setStatus(document.querySelector('#contentForm button'), 'Saved!');
});

// Rendering Lists
function renderSimpleList(boxId, items, key) {
  const box = document.getElementById(boxId); box.innerHTML = '';
  if(!items || items.length === 0) {
      box.innerHTML = '<p class="text-muted">No data available.</p>';
      return;
  }
  items.forEach((item, index) => {
    const node = document.createElement('div'); node.className = 'admin-item';
    node.innerHTML = `<p>${typeof item==='string'?item:`<strong>${item.title}</strong><br>${item.text}`}</p><button class="tiny-btn delete" data-index="${index}">Delete</button>`;
    node.querySelector('button').addEventListener('click', async () => { 
        contentState[key].splice(index, 1); 
        await saveContent(); 
    });
    box.appendChild(node);
  });
}

// QUICK ADD ACTIONS (Fixed Logic)
document.getElementById('addQuoteBtn').addEventListener('click', async () => {
  const input = document.getElementById('quoteInput');
  if(!input.value.trim()) return;
  contentState.quotes = contentState.quotes || [];
  contentState.quotes.push(input.value.trim());
  await saveContent();
  input.value = '';
  setStatus(document.getElementById('quickStatus'), 'Quote added successfully!');
});

document.getElementById('addExerciseBtn').addEventListener('click', async () => {
  const title = document.getElementById('exerciseTitle');
  const text = document.getElementById('exerciseText');
  if(!title.value.trim() || !text.value.trim()) return;
  contentState.exercises = contentState.exercises || [];
  contentState.exercises.push({ title: title.value.trim(), text: text.value.trim() });
  await saveContent();
  title.value = ''; text.value = '';
  setStatus(document.getElementById('quickStatus'), 'Exercise added successfully!');
});

document.getElementById('addResourceBtn').addEventListener('click', async () => {
  const title = document.getElementById('resourceTitle');
  const text = document.getElementById('resourceText');
  if(!title.value.trim() || !text.value.trim()) return;
  contentState.resources = contentState.resources || [];
  contentState.resources.push({ title: title.value.trim(), text: text.value.trim() });
  await saveContent();
  title.value = ''; text.value = '';
  setStatus(document.getElementById('quickStatus'), 'Resource added successfully!');
});