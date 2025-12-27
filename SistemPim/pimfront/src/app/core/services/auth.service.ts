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

// IMPORTANTE: Tudo vindo do SDK padrão (firebase/firestore)
// Isso evita o erro de injeção do Angular
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
  limit 
} from 'firebase/firestore';

import { getApp } from 'firebase/app'; // Garante a conexão correta
import { LoginData, RegisterData } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  // Inicializa o banco de dados da forma mais segura possível
  private db = getFirestore(getApp());

  user$ = user(this.auth);

  constructor() {}

  async login(data: LoginData) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, data.email, data.password);
      // Busca dados para garantir que a conexão está ativa
      await this.getDadosUsuario(result.user.uid);
      this.router.navigate(['/turmas']);
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
          uid: result.user.uid // Garante o ID salvo
        });
      } else {
        // Se já existe, garante que o campo UID esteja atualizado (correção de bug antigo)
        if (!dadosExistentes.uid) {
           await this.updateProfileData(result.user.uid, { uid: result.user.uid });
        }
      }

      this.router.navigate(['/turmas']);
      return result.user;
    } catch (error) {
      console.error("Erro no Google Login:", error);
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
          uid: userCredential.user.uid, // Importante
          seguidores: [],
          seguindo: []
        });
      }
      this.router.navigate(['/turmas']);
    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    }
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  // --- MÉTODOS DE BANCO DE DADOS (USANDO this.db) ---

  async getDadosUsuario(uid: string): Promise<any> {
    if (!uid) return null;
    try {
      const docRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(docRef);
      // Retorna os dados + o ID garantido
      return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      return null;
    }
  }

  async updateProfileData(uid: string, data: any) {
    try {
      const docRef = doc(this.db, 'users', uid);
      // Merge true evita apagar campos existentes
      await setDoc(docRef, { ...data, uid: uid }, { merge: true });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      throw error;
    }
  }

  async atualizarNomeUsuario(novoNome: string) {
    if (this.auth.currentUser) {
      const uid = this.auth.currentUser.uid;
      await updateProfile(this.auth.currentUser, { displayName: novoNome });
      await this.updateProfileData(uid, { nome: novoNome });
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

  // --- SEGUIR / DEIXAR DE SEGUIR ---

  async followUser(meuId: string, alvoId: string) {
    try {
      const meuRef = doc(this.db, 'users', meuId);
      const alvoRef = doc(this.db, 'users', alvoId);

      await Promise.all([
        updateDoc(meuRef, { seguindo: arrayUnion(alvoId) }),
        updateDoc(alvoRef, { seguidores: arrayUnion(meuId) })
      ]);
    } catch (error) {
      console.error("Erro ao seguir:", error);
      throw error;
    }
  }

  async unfollowUser(meuId: string, alvoId: string) {
    try {
      const meuRef = doc(this.db, 'users', meuId);
      const alvoRef = doc(this.db, 'users', alvoId);

      await Promise.all([
        updateDoc(meuRef, { seguindo: arrayRemove(alvoId) }),
        updateDoc(alvoRef, { seguidores: arrayRemove(meuId) })
      ]);
    } catch (error) {
      console.error("Erro ao deixar de seguir:", error);
      throw error;
    }
  }

  // --- CHAT: LISTAR AMIGOS ---

  async getFollowingUsers(meuId: string) {
    try {
      const meuDoc = await getDoc(doc(this.db, 'users', meuId));
      const idsSeguindo = meuDoc.data()?.['seguindo'] || [];

      if (idsSeguindo.length === 0) return [];

      const usersRef = collection(this.db, 'users');
      // Limite de 10 para o operador 'in'
      const q = query(usersRef, where('uid', 'in', idsSeguindo.slice(0, 10)));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data());
    } catch (error) {
      console.error("Erro ao buscar amigos:", error);
      return [];
    }
  }
}