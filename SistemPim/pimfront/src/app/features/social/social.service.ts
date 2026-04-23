import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
    return new Observable((observer) => {
      const postsRef = collection(this.firestore, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          const posts = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Post, 'id'>),
            likes: (d.data() as any).likes || [],
            salvos: (d.data() as any).salvos || [],
            comentariosCount: (d.data() as any).comentariosCount || 0,
          })) as Post[];
          observer.next(posts);
        },
        (error) => {
          console.error('Erro no Listener:', error);
          observer.error(error);
        }
      );
      return () => unsubscribe();
    });
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
    return new Observable((observer) => {
      const ref = collection(this.firestore, 'posts', postId, 'comentarios');
      const q = query(ref, orderBy('criadoEm', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Comentario));
      }, (err) => observer.error(err));
      return () => unsub();
    });
  }

  async addComentario(postId: string, comentario: Omit<Comentario, 'id'>) {
    const ref = collection(this.firestore, 'posts', postId, 'comentarios');
    await addDoc(ref, { ...comentario, criadoEm: serverTimestamp() });
    // Incrementa contador
    await updateDoc(doc(this.firestore, 'posts', postId), {
      comentariosCount: (await getDoc(doc(this.firestore, 'posts', postId))).data()?.['comentariosCount'] + 1 || 1
    });
  }

  async excluirPost(postId: string) {
    return await deleteDoc(doc(this.firestore, 'posts', postId));
  }
}
