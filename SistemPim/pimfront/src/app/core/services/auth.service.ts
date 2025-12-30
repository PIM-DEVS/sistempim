import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  Auth, 
  user, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from '@angular/fire/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  getApp 
} from 'firebase/firestore';
import { LoginData, RegisterData } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private db = getFirestore(getApp());

  user$ = user(this.auth);

  constructor() {}

  // --- LOGIN E REGISTRO ---

  async login(data: LoginData) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, data.email, data.password);
      await this.getDadosUsuario(result.user.uid);
      this.router.navigate(['/dashboard']); // Mudei para dashboard
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  async loginGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      
      const dadosExistentes = await this.getDadosUsuario(result.user.uid);
      
      if (!dadosExistentes) {
        await this.updateProfileData(result.user.uid, {
          email: result.user.email,
          nome: result.user.displayName,
          role: 'aluno',
          foto: result.user.photoURL,
          uid: result.user.uid 
        });
      } else {
        if (!dadosExistentes['uid']) {
           await this.updateProfileData(result.user.uid, { uid: result.user.uid });
        }
      }
      return result.user;
    } catch (error) {
      console.error("Erro no Google Login:", error);
      throw error;
    }
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  // --- FIRESTORE ---

  async getDadosUsuario(uid: string): Promise<any> {
    if (!uid) return null;
    try {
      const docRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      return null;
    }
  }

  async updateProfileData(uid: string, data: any) {
    try {
      const docRef = doc(this.db, 'users', uid);
      await setDoc(docRef, { ...data, uid: uid }, { merge: true });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      throw error;
    }
  }
}