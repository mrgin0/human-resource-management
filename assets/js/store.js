import { fb } from './firebase.js';
import { DEFAULT_SETTINGS } from './calc.js';
import { DEFAULT_LETTERS } from './letters.js';

// ---------- backend demo (tanpa Firebase) ----------
const demo = {
  settings: null,
  hosts: [{ id: 'h1', name: 'Host Contoh', jabatan: 'Host Live', active: true }],
  daily: [],
  letters: [],
  users: []
};

let uid = 0;
const newId = () => `x${Date.now().toString(36)}${(uid++).toString(36)}`;

export const isLive = () => fb.ready;

// ---------- settings ----------
export async function loadSettings() {
  const fallback = { ...structuredClone(DEFAULT_SETTINGS), letters: { ...DEFAULT_LETTERS } };

  if (!isLive()) {
    if (!demo.settings) demo.settings = fallback;
    return demo.settings;
  }

  const { doc, getDoc, setDoc } = fb.api;
  const ref = doc(fb.db, 'settings', 'app');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, fallback);
    return fallback;
  }
  return mergeDefaults(snap.data(), fallback);
}

function mergeDefaults(saved, fallback) {
  const out = { ...fallback, ...saved };
  for (const k of ['company', 'weights', 'spRules', 'letters']) {
    out[k] = { ...fallback[k], ...(saved[k] || {}) };
  }
  return out;
}

export async function saveSettings(settings) {
  if (!isLive()) { demo.settings = settings; return; }
  const { doc, setDoc } = fb.api;
  await setDoc(doc(fb.db, 'settings', 'app'), settings);
}

// ---------- generic collection ----------
export async function listAll(col) {
  if (!isLive()) return structuredClone(demo[col] || []);
  const { collection, getDocs } = fb.api;
  const snap = await getDocs(collection(fb.db, col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function create(col, data) {
  if (!isLive()) {
    const rec = { id: newId(), ...data };
    demo[col] = demo[col] || [];
    demo[col].push(rec);
    return rec.id;
  }
  const { collection, addDoc } = fb.api;
  const ref = await addDoc(collection(fb.db, col), data);
  return ref.id;
}

export async function update(col, id, data) {
  if (!isLive()) {
    const i = (demo[col] || []).findIndex(r => r.id === id);
    if (i > -1) demo[col][i] = { ...demo[col][i], ...data };
    return;
  }
  const { doc, updateDoc } = fb.api;
  await updateDoc(doc(fb.db, col, id), data);
}

export async function remove(col, id) {
  if (!isLive()) {
    demo[col] = (demo[col] || []).filter(r => r.id !== id);
    return;
  }
  const { doc, deleteDoc } = fb.api;
  await deleteDoc(doc(fb.db, col, id));
}

// ---------- profil pengguna & peran ----------
export async function ensureUserProfile(user, bootstrapAdmins = []) {
  const isBootstrapAdmin = bootstrapAdmins
    .map(e => e.toLowerCase())
    .includes((user.email || '').toLowerCase());

  if (!isLive()) {
    return { uid: 'demo', email: user.email || 'demo@lokal', role: 'admin', name: 'Admin Demo' };
  }

  const { doc, getDoc, setDoc } = fb.api;
  const ref = doc(fb.db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile = {
      email: user.email,
      name: user.displayName || (user.email || '').split('@')[0],
      role: isBootstrapAdmin ? 'admin' : 'viewer'
    };
    await setDoc(ref, profile);
    return { uid: user.uid, ...profile };
  }

  const data = snap.data();
  if (isBootstrapAdmin && data.role !== 'admin') {
    await setDoc(ref, { ...data, role: 'admin' });
    data.role = 'admin';
  }
  return { uid: user.uid, ...data };
}

export async function setUserRole(uid, role) {
  if (!isLive()) return;
  const { doc, updateDoc } = fb.api;
  await updateDoc(doc(fb.db, 'users', uid), { role });
}
