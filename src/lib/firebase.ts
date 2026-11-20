import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import workspaceFirebaseConfig from '../../firebase-applet-config.json';

// Provisioned Firestore & Primary Traveler Auth project
const FIRESTORE_CONFIG = {
  projectId: 'synthetic-atrium-xpjks',
  appId: '1:1080865965718:web:977667227d047ceaa724b7',
  apiKey: 'AIzaSyBBN9L8kLqirqZN0WN9-QHMIXo5oegG2Bk',
  authDomain: 'synthetic-atrium-xpjks.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-454079f0-98b5-473b-b78d-ed435d9de412',
  storageBucket: 'synthetic-atrium-xpjks.firebasestorage.app',
  messagingSenderId: '1080865965718',
};

const existingFirestoreApp = getApps().find((a) => a.name === 'giftstar-firestore');
const firestoreApp = existingFirestoreApp ?? initializeApp(FIRESTORE_CONFIG, 'giftstar-firestore');

export const db = getFirestore(firestoreApp, FIRESTORE_CONFIG.firestoreDatabaseId);
export const auth = getAuth(firestoreApp);

// Google Workspace OAuth Firebase App (from firebase-applet-config.json)
const existingWorkspaceApp = getApps().find((a) => a.name === '[DEFAULT]');
const workspaceApp = existingWorkspaceApp ?? initializeApp(workspaceFirebaseConfig);
export const workspaceAuth = getAuth(workspaceApp);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const travelerGoogleProvider = new GoogleAuthProvider();
travelerGoogleProvider.setCustomParameters({ prompt: 'select_account' });

const workspaceGoogleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => workspaceGoogleProvider.addScope(scope));
workspaceGoogleProvider.setCustomParameters({ prompt: 'consent' });

// Strict in-memory token cache (never stored in localStorage/sessionStorage)
let cachedWorkspaceAccessToken: string | null = null;
let isWorkspaceSigningIn = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export const BOOTSTRAPPED_ADMIN_EMAIL = 'rev.pal.john@gmail.com';

export function isAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  return user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
}

export async function signInWithGoogleTraveler(): Promise<User> {
  const result = await signInWithPopup(auth, travelerGoogleProvider);
  const user = result.user;
  await syncUserProfileDocuments(user);
  return user;
}

async function syncUserProfileDocuments(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  try {
    const existingSnap = await getDoc(userRef);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Traveler').slice(0, 100);
    const photoURL = (user.photoURL || '').slice(0, 500);

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        ...(photoURL ? { photoURL } : {}),
        role: 'traveler',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userRef,
        {
          displayName,
          ...(photoURL ? { photoURL } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await setDoc(
      privateRef,
      {
        uid: user.uid,
        email: (user.email || '').slice(0, 200),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function signOutTraveler(): Promise<void> {
  await signOut(auth);
  cachedWorkspaceAccessToken = null;
  await signOut(workspaceAuth).catch(() => undefined);
}

export function initWorkspaceAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(workspaceAuth, (user: User | null) => {
    if (user) {
      if (cachedWorkspaceAccessToken) {
        onAuthSuccess?.(user, cachedWorkspaceAccessToken);
      } else if (!isWorkspaceSigningIn) {
        cachedWorkspaceAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedWorkspaceAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function connectGoogleWorkspace(): Promise<{ user: User; accessToken: string }> {
  try {
    isWorkspaceSigningIn = true;
    const result = await signInWithPopup(workspaceAuth, workspaceGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace access token.');
    }
    cachedWorkspaceAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedWorkspaceAccessToken };
  } finally {
    isWorkspaceSigningIn = false;
  }
}

export function getWorkspaceAccessToken(): string | null {
  return cachedWorkspaceAccessToken;
}

export async function disconnectGoogleWorkspace(): Promise<void> {
  cachedWorkspaceAccessToken = null;
  await signOut(workspaceAuth);
}
