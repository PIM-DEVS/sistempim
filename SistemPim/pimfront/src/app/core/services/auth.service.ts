import { Injectable, NgZone, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  updateDoc,
  arrayUnion,
  arrayRemove
} from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, of, from } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

export interface AppUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  photoUrl: string;
  photoURL: string;
  nome?: string;
  foto?: string;
  genero?: string;
  role?: string;
  bio?: string;
  cargo?: string;
  competencias?: string[];
  seguidores?: string[];
  seguindo?: string[];
  displayName?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  public user$ = new BehaviorSubject<AppUser | null>(null);

  constructor() {
    // Abordagem Reativa: Evita 'Outside Injection Context'
    user(this.auth).pipe(
      switchMap(firebaseUser => {
        if (!firebaseUser) return of(null);
        
        // Converte a busca de perfil em um Observable para a corrente
        return from(this.buscarPerfilCompleto(firebaseUser.uid, firebaseUser.email || '')).pipe(
          map(perfil => {
            const nome = perfil?.nome || perfil?.name || firebaseUser.displayName || 'Usuário';
            const foto = perfil?.foto || perfil?.photoUrl || firebaseUser.photoURL || '';
            return {
              ...(perfil || {}),
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: nome,
              displayName: nome,
              nome: nome,
              photoUrl: foto,
              photoURL: foto,
              foto: foto,
            } as AppUser;
          }),
          catchError(() => {
            const nome = firebaseUser.displayName || 'Usuário';
            const foto = firebaseUser.photoURL || '';
            return of({
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: nome,
              displayName: nome,
              nome: nome,
              photoUrl: foto,
              photoURL: foto,
              foto: foto,
            } as AppUser);
          })
        );
      })
    ).subscribe(appUser => {
      this.zone.run(() => {
        this.user$.next(appUser);
      });
    });
  }

  // ─── ESTRATÉGIA INTELIGENTE: busca pelo uid, depois pelo email ───────────────
  // Isso resolve a compatibilidade com usuários antigos que tinham email como chave
  private async buscarPerfilCompleto(uid: string, email: string): Promise<AppUser | null> {
    // 1. Tenta pelo uid (padrão novo)
    try {
      const snapUid = await getDoc(doc(this.firestore, 'users', uid));
      if (snapUid.exists()) {
        return { ...snapUid.data(), uid, id: uid } as AppUser;
      }
    } catch {}

    // 2. Tenta pelo email como document ID (padrão legado)
    if (email) {
      try {
        const snapEmail = await getDoc(doc(this.firestore, 'users', email));
        if (snapEmail.exists()) {
          const data = snapEmail.data() as AppUser;
          // Migra: cria uma cópia com uid como chave para o futuro
          await setDoc(doc(this.firestore, 'users', uid), { ...data, uid }, { merge: true });
          return { ...data, uid, id: uid } as AppUser;
        }
      } catch {}
    }

    // 3. Busca por campo email na coleção (padrão anterior de alguns sistemas)
    if (email) {
      try {
        const q = query(
          collection(this.firestore, 'users'),
          where('email', '==', email),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data() as AppUser;
          // Migra para uid como chave
          await setDoc(doc(this.firestore, 'users', uid), { ...data, uid }, { merge: true });
          return { ...data, uid, id: uid } as AppUser;
        }
      } catch {}
    }

    // 4. Tenta pelo backend NestJS
    if (email) {
      try {
        const u = await firstValueFrom(
          this.http.get<AppUser>(`${this.apiUrl}/users/${email}`)
        );
        if (u && (u.id || u.uid || u.email)) {
          return this.sanitizarUsuario({ ...u, uid, id: uid });
        }
      } catch {}
    }

    return null;
  }

  // ─── API pública de busca de perfil ─────────────────────────────────────────
  async getPerfilPorUid(uid: string): Promise<AppUser | null> {
    const currentUser = this.user$.value;
    const email = currentUser?.email || '';
    return this.buscarPerfilCompleto(uid, email);
  }

  async getDadosUsuario(identificador: string | undefined): Promise<AppUser> {
    if (!identificador) return {} as AppUser;

    const currentUser = this.user$.value;
    const isEmail = identificador.includes('@');
    const uid = isEmail ? (currentUser?.uid || '') : identificador;
    const email = isEmail ? identificador : (currentUser?.email || '');

    const perfil = await this.buscarPerfilCompleto(uid, email);
    if (perfil) return perfil;

    return {} as AppUser;
  }

  // ─── SALVAR PERFIL (usa UID como document ID) ─────────────────────────────────
  async updateProfileData(userId: string | undefined, data: any): Promise<any> {
    if (!userId) throw new Error('userId não fornecido');
    const currentUser = this.user$.value;

    const profileData: Record<string, any> = { uid: userId };

    const add = (key: string, val: any) => {
      if (val !== undefined && val !== null && val !== '') profileData[key] = val;
    };

    const nome = data.nome || data.name || currentUser?.nome || currentUser?.displayName || '';
    add('nome', nome);
    add('name', nome);
    add('email', data.email || currentUser?.email);
    add('genero', data.genero || currentUser?.genero);
    add('foto', data.foto || data.photoUrl || currentUser?.foto);
    add('photoUrl', data.foto || data.photoUrl || currentUser?.foto);
    add('bio', data.bio || currentUser?.bio);
    add('cargo', data.cargo || data.jobTitle || currentUser?.cargo);
    add('role', data.role || currentUser?.role);
    if (data.competencias) add('competencias', data.competencias);

    // Salva com merge:true — nunca apaga dados existentes
    await setDoc(doc(this.firestore, 'users', userId), profileData, { merge: true });
    console.log('✅ Perfil salvo no Firestore (uid:', userId, ')');

    // Atualiza o BehaviorSubject local imediatamente (UX instantânea)
    if (currentUser) {
      this.user$.next({ ...currentUser, ...profileData, uid: userId, id: userId });
    }

    // Sincroniza com backend sem bloquear
    firstValueFrom(
      this.http.patch(`${this.apiUrl}/users/${currentUser?.email}`, profileData)
    ).catch(() => {});

    return profileData;
  }

  // ─── LOGIN GOOGLE ─────────────────────────────────────────────────────────────
  async loginGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    const fu = credential.user;

    // Verifica se já existe perfil (por uid ou email) antes de criar
    const existing = await this.buscarPerfilCompleto(fu.uid, fu.email || '');
    if (!existing) {
      await setDoc(doc(this.firestore, 'users', fu.uid), {
        nome: fu.displayName || '',
        name: fu.displayName || '',
        email: fu.email || '',
        foto: fu.photoURL || '',
        photoUrl: fu.photoURL || '',
        uid: fu.uid,
        criadoEm: new Date().toISOString(),
      }, { merge: true });
    }

    return fu;
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────
  async logout() {
    await signOut(this.auth);
    this.user$.next(null);
  }

  // ─── BUSCA DE USUÁRIOS ────────────────────────────────────────────────────────
  async buscarUsuariosPorNome(termo: string): Promise<AppUser[]> {
    try {
      // Busca limitada para filtrar localmente (Resolve o problema de Maiúscula/Minúscula)
      const q = query(collection(this.firestore, 'users'), limit(100));
      const snapshot = await getDocs(q);
      
      const termoNormalizado = termo.toLowerCase().trim();
      const todos = snapshot.docs.map(d => ({ uid: d.id, id: d.id, ...d.data() } as AppUser));
      
      // Filtra de forma inteligente usando Javascript para não quebrar caso o usuário pesquise 'joao' e o firebase tenha 'Joao'
      return todos.filter(u => {
        const nome = (u.nome || u.name || u.displayName || '').toLowerCase();
        return nome.includes(termoNormalizado);
      });
    } catch {
      return [];
    }
  }

  // ─── ROLE DETECTION ────────────────────────────────────────────────────────
  getRoleByEmail(email: string): string {
    if (!email) return 'ALUNO';
    if (email.includes('aluno.ifal.edu.br')) return 'ALUNO';
    if (email.includes('ifal.edu.br')) return 'PROFESSOR';
    return 'ALUNO'; // Fallback para outros emails (ex: gmail durante dev)
  }

  // ─── FOLLOW / UNFOLLOW ────────────────────────────────────────────────────────
  async followUser(meuId: string | undefined, idAlvo: string): Promise<boolean> {
    if (!meuId || !idAlvo) return false;
    try {
      // Adiciona idAlvo em meu 'seguindo'
      await updateDoc(doc(this.firestore, 'users', meuId), {
        seguindo: arrayUnion(idAlvo)
      });
      // Adiciona meuId nos 'seguidores' do alvo
      await updateDoc(doc(this.firestore, 'users', idAlvo), {
        seguidores: arrayUnion(meuId)
      });
      // Atualiza o BehaviorSubject local
      const current = this.user$.value;
      if (current) {
        const seguindo = [...(current.seguindo || []), idAlvo];
        this.user$.next({ ...current, seguindo });
      }
      return true;
    } catch (e) {
      console.error('Erro ao seguir:', e);
      return false;
    }
  }

  async unfollowUser(meuId: string | undefined, idAlvo: string): Promise<boolean> {
    if (!meuId || !idAlvo) return false;
    try {
      await updateDoc(doc(this.firestore, 'users', meuId), {
        seguindo: arrayRemove(idAlvo)
      });
      await updateDoc(doc(this.firestore, 'users', idAlvo), {
        seguidores: arrayRemove(meuId)
      });
      const current = this.user$.value;
      if (current) {
        const seguindo = (current.seguindo || []).filter((id: string) => id !== idAlvo);
        this.user$.next({ ...current, seguindo });
      }
      return true;
    } catch (e) {
      console.error('Erro ao deixar de seguir:', e);
      return false;
    }
  }

  async carregarContatos(_uid: string) { return []; }

  private sanitizarUsuario(u: any): AppUser {
    const foto = u.photoUrl || u.foto || u.photoURL || '';
    const nome = u.nome || u.name || u.displayName || 'Usuário';
    return {
      ...u,
      uid: u.uid || u.id || '',
      id: u.uid || u.id || '',
      name: nome,
      nome: nome,
      displayName: nome,
      photoUrl: foto,
      photoURL: foto,
      foto,
    };
  }
}