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
    // Removendo orderBy temporariamente para evitar erro de índice ausente
    return collectionData(messagesRef, { idField: 'id' });
  }

  // Envia a mensagem para o banco e cria uma notificação para o destinatário
  async enviarMensagem(chatId: string, texto: string, senderId: string, recipientId: string) {
    if (!texto?.trim() || !chatId || !senderId || !recipientId) {
      console.warn('Dados insuficientes para enviar mensagem:', { chatId, senderId, recipientId });
      throw new Error('Dados do chat incompletos.');
    }

    try {
      const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        texto: texto.trim(),
        senderId: senderId,
        timestamp: serverTimestamp()
      });
      console.log('✅ Mensagem enviada para o Firestore');
    } catch (error) {
      console.error('❌ Erro crítico ao gravar mensagem:', error);
      throw error;
    }

    // Criar notificação (não bloqueia o envio da mensagem se falhar)
    try {
      const notifRef = collection(this.firestore, 'notificacoes');
      await addDoc(notifRef, {
        uidDestinatario: recipientId,
        titulo: 'Nova mensagem',
        mensagem: texto.length > 50 ? texto.substring(0, 50) + '...' : texto,
        data: serverTimestamp(),
        lida: false,
        tipo: 'sistema'
      });
    } catch (e) {
      console.warn('⚠️ Falha ao criar notificação, mas a mensagem foi enviada.');
    }
  }
}