import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  getFirestore,
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
} from 'firebase/firestore';

export interface Post {
  id: string;
  content: string;
  createdAt: any;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  likes: string[];
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  // Pega a instância do banco de dados diretamente, sem depender de injeção
  private db = getFirestore();

  getPosts(): Observable<Post[]> {
    return new Observable((observer) => {
      const postsRef = collection(this.db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));

      // O 'onSnapshot' é o ouvinte nativo do Firebase (mais estável)
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const posts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Post[];
          observer.next(posts);
        },
        (error) => {
          console.error('Erro no Listener Nativo:', error);
          observer.error(error);
        },
      );

      // Cancela a conexão quando o componente é destruído
      return () => unsubscribe();
    });
  }

  async criarPost(content: string, user: any, mediaUrl: string = '') {
    const postsRef = collection(this.db, 'posts');
    return await addDoc(postsRef, {
      content,
      userId: user.uid,
      userName: user.nome || 'Usuário',
      userPhoto: user.foto || 'assets/avatar-placeholder.png',
      mediaUrl,
      likes: [],
      createdAt: serverTimestamp(),
    });
  }

  async toggleLike(postId: string, userId: string, isLiked: boolean) {
    const postRef = doc(this.db, 'posts', postId);
    return await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    });
  }

  async excluirPost(postId: string) {
    const postRef = doc(this.db, 'posts', postId);
    return await deleteDoc(postRef);
  }
}
