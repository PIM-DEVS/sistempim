import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// Interface "Blindada" (Garante que os campos principais nunca sejam undefined)
export interface AppUser {
  // Campos obrigatórios (resolvem os erros de "Type undefined is not assignable to string")
  id: string; 
  uid: string;
  email: string;
  name: string;
  photoUrl: string; 
  photoURL: string; // Alias obrigatório

  // Campos opcionais
  bio?: string;
  jobTitle?: string;
  skills?: string;
  role?: string;

  // Compatibilidade com legado
  displayName?: string; 
  nome?: string;
  foto?: string;
  fotoPerfil?: string;
  avatar?: string;
  genero?: string;
  seguindo?: string[];

  // Permite acesso dinâmico
  [key: string]: any; 
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000'; // Backend NestJS
  
  public user$ = new BehaviorSubject<AppUser | null>(null);

  constructor(
    private auth: Auth, 
    private http: HttpClient
  ) {
    user(this.auth).subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const dbUser = await this.getDadosUsuario(firebaseUser.email || firebaseUser.uid);
          
          // Garante que NENHUM campo vital seja undefined
          const safeId = dbUser.id || firebaseUser.uid || '';
          const safeName = dbUser.name || firebaseUser.displayName || 'Usuário';
          const safePhoto = dbUser.photoUrl || firebaseUser.photoURL || '';

          const mergedUser: AppUser = {
            ...dbUser,
            email: firebaseUser.email || '',
            
            // Força valores string para satisfazer o TypeScript
            uid: safeId,
            id: safeId,
            
            name: safeName,
            displayName: safeName,
            nome: safeName,
            
            photoUrl: safePhoto,
            photoURL: safePhoto,
            foto: safePhoto,
          };

          this.user$.next(mergedUser);
        } catch (e) {
          // Fallback seguro
          this.user$.next({
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Usuário',
            displayName: firebaseUser.displayName || 'Usuário',
            nome: firebaseUser.displayName || 'Usuário',
            photoUrl: firebaseUser.photoURL || '',
            photoURL: firebaseUser.photoURL || '',
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            foto: firebaseUser.photoURL || ''
          });
        }
      } else {
        this.user$.next(null);
      }
    });
  }

  // --- LOGIN ---
  async loginGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    const user = credential.user;

    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/users`, {
        email: user.email,
        name: user.displayName,
        photoUrl: user.photoURL
      }));
    } catch (error) {
      console.warn('Erro backend:', error);
    }
    return user;
  }

  async logout() {
    await signOut(this.auth);
    this.user$.next(null);
  }

  // --- DADOS ---
  async getDadosUsuario(identificador: string | undefined): Promise<AppUser> {
    if (!identificador) return {} as AppUser;

    const endpoint = identificador.includes('@') 
      ? `${this.apiUrl}/users/${identificador}` 
      : `${this.apiUrl}/users/${identificador}`; 

    try {
      const usuario = await firstValueFrom(this.http.get<AppUser>(endpoint));
      
      // Sanitização no retorno também
      const safePhoto = usuario.photoUrl || '';
      
      return {
        ...usuario,
        uid: usuario.id || '',
        id: usuario.id || '',
        displayName: usuario.name,
        nome: usuario.name,
        photoURL: safePhoto,
        photoUrl: safePhoto,
        foto: safePhoto
      };
    } catch (error) {
      return {} as AppUser;
    }
  }

  async updateProfileData(userId: string | undefined, data: any) {
    if (!userId) return;
    const currentUser = this.user$.value;
    if (!currentUser) return;

    return firstValueFrom(this.http.patch(`${this.apiUrl}/users/${currentUser.email}`, {
      name: data.nome || data.name,
      bio: data.bio,
      jobTitle: data.cargo || data.jobTitle,
      skills: data.skills,
      photoUrl: data.foto || data.photoUrl
    }));
  }

  // --- SOCIAIS ---
  async followUser(meuId: string | undefined, idAmigo: string) { return Promise.resolve(true); }
  async unfollowUser(meuId: string | undefined, idAmigo: string) { return Promise.resolve(true); }
  async buscarUsuariosPorNome(termo: string): Promise<AppUser[]> { return []; }
  async carregarContatos(uid: string) { return []; }
}