import { Injectable, inject } from '@angular/core';
import {
  Auth,
  user,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
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
  limit,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Router } from '@angular/router';
import { LoginData, RegisterData } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private db = getFirestore(getApp());

  user$ = user(this.auth);

  async login(data: LoginData) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, data.email, data.password);
      await this.getDadosUsuario(result.user.uid);
      this.router.navigate(['/turmas']);
    } catch (error) {
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
        });
      }
      this.router.navigate(['/turmas']);
      return result.user;
    } catch (error) {
      throw error;
    }
  }

  async register(data: RegisterData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        data.email,
        data.password,
      );
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: data.name });
        await this.updateProfileData(userCredential.user.uid, {
          nome: data.name,
          email: data.email,
          role: data.email.includes('professor') ? 'professor' : 'aluno',
        });
      }
      this.router.navigate(['/turmas']);
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  async getDadosUsuario(uid: string): Promise<any> {
    try {
      const docRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      return null;
    }
  }

  async updateProfileData(uid: string, data: any) {
    const docRef = doc(this.db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
  }

  async atualizarNomeUsuario(novoNome: string) {
    if (this.auth.currentUser) {
      const uid = this.auth.currentUser.uid;
      await updateProfile(this.auth.currentUser, { displayName: novoNome });
      await this.updateProfileData(uid, { nome: novoNome });
      await this.auth.currentUser.reload();
    }
  }

  async buscarUsuariosPorNome(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];
    try {
      const colRef = collection(this.db, 'users');
      const q = query(
        colRef,
        where('nome', '>=', termo),
        where('nome', '<=', termo + '\uf8ff'),
        limit(5),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
    } catch (error) {
      console.error('Erro na busca:', error);
      return [];
    }
  }
}
