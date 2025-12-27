import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  collectionData,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Notificacao {
  id?: string;
  uidDestinatario: string;
  titulo: string;
  mensagem: string;
  data: Timestamp;
  lida: boolean;
  tipo: 'aviso' | 'atividade' | 'sistema';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore);

  getNotificacoes(uid: string): Observable<Notificacao[]> {
    const colRef = collection(this.firestore, 'notificacoes');
    const q = query(colRef, where('uidDestinatario', '==', uid), orderBy('data', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Notificacao[]>;
  }

  async marcarComoLida(id: string) {
    const docRef = doc(this.firestore, 'notificacoes', id);
    return updateDoc(docRef, { lida: true });
  }

  async marcarTodasLidas(uid: string) {
    const colRef = collection(this.firestore, 'notificacoes');
    const q = query(colRef, where('uidDestinatario', '==', uid), where('lida', '==', false));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(this.firestore);
    querySnapshot.forEach((d) => {
      batch.update(d.ref, { lida: true });
    });
    return batch.commit();
  }
}
