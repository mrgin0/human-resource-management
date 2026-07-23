import { firebaseConfig, IS_CONFIGURED } from './config.js';

const V = '10.12.2';
const base = `https://www.gstatic.com/firebasejs/${V}`;

export let fb = { ready: false, auth: null, db: null, api: {} };

export async function initFirebase() {
  if (!IS_CONFIGURED) return fb;

  const [appMod, authMod, dbMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);

  const app = appMod.initializeApp(firebaseConfig);

  fb = {
    ready: true,
    auth: authMod.getAuth(app),
    db: dbMod.getFirestore(app),
    api: {
      onAuthStateChanged: authMod.onAuthStateChanged,
      signIn: authMod.signInWithEmailAndPassword,
      signUp: authMod.createUserWithEmailAndPassword,
      signOut: authMod.signOut,
      collection: dbMod.collection,
      doc: dbMod.doc,
      getDoc: dbMod.getDoc,
      getDocs: dbMod.getDocs,
      setDoc: dbMod.setDoc,
      addDoc: dbMod.addDoc,
      updateDoc: dbMod.updateDoc,
      deleteDoc: dbMod.deleteDoc,
      query: dbMod.query,
      where: dbMod.where,
      orderBy: dbMod.orderBy,
      serverTimestamp: dbMod.serverTimestamp
    }
  };
  return fb;
}
