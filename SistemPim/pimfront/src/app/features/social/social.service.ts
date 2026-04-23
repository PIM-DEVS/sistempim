import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { 
  Firestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  setDoc
} from '@angular/fire/firestore';

export interface Post {
  id: string;
  content: string;
  createdAt: any;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  likes: string[];
  salvos: string[];
  comentariosCount: number;
}

export interface Comentario {
  id?: string;
  texto: string;
  autorId: string;
  autorNome: string;
  autorFoto: string;
  criadoEm: any;
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private firestore = inject(Firestore);

  getPosts(): Observable<Post[]> {
    const postsRef = collection(this.firestore, 'posts');
    // Removendo orderBy para evitar erro de índice ausente
    return collectionData(postsRef, { idField: 'id' }).pipe(
      map(docs => docs.map(d => ({
        ...d,
        likes: (d as any).likes || [],
        salvos: (d as any).salvos || [],
        comentariosCount: (d as any).comentariosCount || 0,
      } as Post)))
    );
  }

  async criarPost(content: string, user: any, mediaUrl: string = '') {
    const postsRef = collection(this.firestore, 'posts');
    return await addDoc(postsRef, {
      content,
      userId: user.uid,
      userName: user.nome || user.name || user.displayName || 'Usuário',
      userPhoto: user.foto || user.photoUrl || user.photoURL || '',
      mediaUrl,
      likes: [],
      salvos: [],
      comentariosCount: 0,
      createdAt: serverTimestamp(),
    });
  }

  async toggleLike(postId: string, userId: string, isLiked: boolean) {
    const postRef = doc(this.firestore, 'posts', postId);
    return await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    });
  }

  async toggleSalvar(postId: string, userId: string, isSalvo: boolean) {
    const postRef = doc(this.firestore, 'posts', postId);
    return await updateDoc(postRef, {
      salvos: isSalvo ? arrayRemove(userId) : arrayUnion(userId),
    });
  }

  // COMENTÁRIOS
  getComentarios(postId: string): Observable<Comentario[]> {
    const ref = collection(this.firestore, 'posts', postId, 'comentarios');
    const q = query(ref, orderBy('criadoEm', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Comentario[]>;
  }

  async addComentario(postId: string, comentario: Omit<Comentario, 'id'>) {
    const ref = collection(this.firestore, 'posts', postId, 'comentarios');
    await addDoc(ref, { ...comentario, criadoEm: serverTimestamp() });
    
    // Incrementa contador
    const postRef = doc(this.firestore, 'posts', postId);
    const snap = await getDoc(postRef);
    const atual = snap.data()?.['comentariosCount'] || 0;
    await updateDoc(postRef, { comentariosCount: atual + 1 });
  }

  async excluirComentario(postId: string, comentarioId: string) {
    const ref = doc(this.firestore, 'posts', postId, 'comentarios', comentarioId);
    await deleteDoc(ref);

    // Decrementa contador
    const postRef = doc(this.firestore, 'posts', postId);
    const snap = await getDoc(postRef);
    const atual = snap.data()?.['comentariosCount'] || 0;
    if (atual > 0) {
      await updateDoc(postRef, { comentariosCount: atual - 1 });
    }
  }

  async excluirPost(postId: string) {
    return await deleteDoc(doc(this.firestore, 'posts', postId));
  }
}
