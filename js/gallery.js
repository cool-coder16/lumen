import { demoMode, getFirebase, getUser } from './auth.js';

const LS = 'lumen.demoGallery';
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
const writeLocal = (a) => localStorage.setItem(LS, JSON.stringify(a));

export async function saveCreation({ name, params, thumb, isPublic }) {
  const u = getUser(); if (!u) throw new Error('Sign in to save.');
  const doc = {
    uid: u.uid, authorName: u.name || 'Artist', name: (name || 'Untitled').slice(0, 60),
    params, thumb, public: !!isPublic, createdAt: Date.now(),
  };
  if (demoMode) { const a = readLocal(); doc.id = 'l' + Date.now().toString(36); a.unshift(doc); writeLocal(a); return doc; }
  const { db, fsM } = getFirebase();
  const ref = await fsM.addDoc(fsM.collection(db, 'creations'), doc);
  return { ...doc, id: ref.id };
}

export async function listMine() {
  const u = getUser(); if (!u) return [];
  if (demoMode) return readLocal().filter((d) => d.uid === u.uid).sort((a, b) => b.createdAt - a.createdAt);
  const { db, fsM } = getFirebase();
  const snap = await fsM.getDocs(fsM.query(fsM.collection(db, 'creations'), fsM.where('uid', '==', u.uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
}

export async function listPublic() {
  if (demoMode) return readLocal().filter((d) => d.public).sort((a, b) => b.createdAt - a.createdAt);
  const { db, fsM } = getFirebase();
  const snap = await fsM.getDocs(fsM.query(fsM.collection(db, 'creations'), fsM.where('public', '==', true), fsM.limit(60)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeCreation(id) {
  if (demoMode) { writeLocal(readLocal().filter((d) => d.id !== id)); return; }
  const { db, fsM } = getFirebase();
  await fsM.deleteDoc(fsM.doc(db, 'creations', id));
}

export async function setPublic(id, value) {
  if (demoMode) { writeLocal(readLocal().map((d) => (d.id === id ? { ...d, public: value } : d))); return; }
  const { db, fsM } = getFirebase();
  await fsM.updateDoc(fsM.doc(db, 'creations', id), { public: value });
}

export async function toggleLike(it) {
  const u = getUser(); if (!u) throw new Error('Sign in to like creations.');
  const liked = (it.likedBy || []).includes(u.uid);
  if (demoMode) {
    writeLocal(readLocal().map((d) => { if (d.id !== it.id) return d; const s = new Set(d.likedBy || []); liked ? s.delete(u.uid) : s.add(u.uid); return { ...d, likedBy: [...s], likeCount: s.size }; }));
    return;
  }
  const { db, fsM } = getFirebase();
  await fsM.updateDoc(fsM.doc(db, 'creations', it.id), {
    likedBy: liked ? fsM.arrayRemove(u.uid) : fsM.arrayUnion(u.uid),
    likeCount: fsM.increment(liked ? -1 : 1),
  });
}
