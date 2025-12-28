import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  collectionData, 
  doc, 
  setDoc, 
  serverTimestamp,
  Timestamp 
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore = inject(Firestore);

  // Gera um ID único e constante para a conversa entre dois usuários
  getChatId(user1: string, user2: string): string {
    return user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
  }

  // Cria o documento do chat se ele ainda não existir
  async criarChatSeNaoExistir(chatId: string) {
    const chatRef = doc(this.firestore, 'chats', chatId);
    // setDoc com merge: true cria se não existir, e não faz nada se já existir
    await setDoc(chatRef, { criacao: serverTimestamp() }, { merge: true });
  }

  // Escuta as mensagens em tempo real
  getMensagens(chatId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
    // Ordena por data de envio (ascendente: mais antiga -> mais nova)
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' });
  }

  // Envia a mensagem para o banco
  async enviarMensagem(chatId: string, texto: string, senderId: string) {
    if (!texto.trim()) return;

    const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      texto: texto,
      senderId: senderId,
      timestamp: serverTimestamp() // Usa a hora do servidor para consistência
    });
  }
}