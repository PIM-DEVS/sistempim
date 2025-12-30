import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
// A CORREÇÃO ESTÁ AQUI EMBAIXO (getApp vem de 'firebase/app', não de firestore)
import { getApp } from 'firebase/app'; 
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
  collection, 
  query, 
  where, 
  getDocs, 
  limit
} from 'firebase/firestore';
import { LoginData } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  // Inicializa o Firestore corretamente
  private db = getFirestore(getApp()); 

  user$ = user(this.auth);

  constructor() {}

  // --- LOGIN E REGISTRO ---

  async login(data: LoginData) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, data.email, data.password);
      await this.getDadosUsuario(result.user.uid);
      this.router.navigate(['/dashboard']);
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

  // ESTA FUNÇÃO FALTAVA E CAUSAVA O ERRO NA TOPBAR
  async buscarUsuariosPorNome(termo: string) {
    if (!termo || !termo.trim()) return [];
    try {
      const usersRef = collection(this.db, 'users');
      const q = query(
        usersRef, 
        where('nome', '>=', termo), 
        where('nome', '<=', termo + '\uf8ff'),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Erro na busca:", error);
      return [];
    }
  }
}