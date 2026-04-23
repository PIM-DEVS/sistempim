import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, updateDoc, arrayUnion, doc, deleteDoc, getDoc, orderBy, Timestamp, Query, DocumentData, setDoc } from '@angular/fire/firestore';
import { Turma } from '../models/turma.model';
import { NotificationService } from './notification.service';
import { inject } from '@angular/core';

export interface PostMural {
  id?: string;
  autor: string;
  uidAutor?: string;
  conteudo: string;
  data: any;
  tipo: 'aviso' | 'material' | 'tarefa';
  photoURL?: string | null;
}

export interface Atividade {
  id?: string;
  titulo: string;
  descricao: string;
  dataEntrega: any;
  dataCriacao: any;
}

export interface EntregaAtividade {
  id?: string;
  alunoId: string;
  nome: string;
  conteudo: string;
  dataEntrega?: any;
}

@Injectable({
  providedIn: 'root',
})
export class TurmaService {
  private notificationService = inject(NotificationService);
  private turmasRef;

  constructor(private db: Firestore) {
    this.turmasRef = collection(this.db, 'turmas');
  }

  async criarTurma(dados: Partial<Turma>) {
    const randomCode = 'PIM-' + Math.floor(100000 + Math.random() * 900000);
    const docRef = await addDoc(this.turmasRef, {
      ...dados,
      codigo: randomCode,
      alunos: [],
      alunosIds: [],
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, ...dados, codigo: randomCode };
  }

  async entrarNaTurma(codigo: string, userId: string, userName: string) {
    const q = query(this.turmasRef, where('codigo', '==', codigo));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Turma não encontrada.');
    const turmaDoc = snapshot.docs[0];

    if (turmaDoc.data()['alunosIds']?.includes(userId)) throw new Error('Você já está na turma.');

    await updateDoc(doc(this.db, 'turmas', turmaDoc.id), {
      alunos: arrayUnion({ uid: userId, nome: userName }),
      alunosIds: arrayUnion(userId),
    });
  }

  async getMinhasTurmas(uid: string, isProfessor: boolean): Promise<Turma[]> {
    const field = isProfessor ? 'professorId' : 'alunosIds';
    const operator = isProfessor ? '==' : 'array-contains';
    const q = query(this.turmasRef, where(field, operator, uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Turma);
  }

  async getTurmaById(id: string): Promise<Turma | undefined> {
    const snap = await getDoc(doc(this.db, 'turmas', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Turma) : undefined;
  }

  getPostsRef(turmaId: string): Query<DocumentData> {
    return query(collection(this.db, 'turmas', turmaId, 'posts'), orderBy('data', 'desc'));
  }

  async adicionarPost(turmaId: string, post: PostMural, postByDocente: boolean = false) {
    const postRef = await addDoc(collection(this.db, 'turmas', turmaId, 'posts'), {
      ...post,
      data: Timestamp.now(),
    });

    if (postByDocente) {
      const turma = await this.getTurmaById(turmaId);
      if (turma?.alunosIds) {
        for (const alunoId of turma.alunosIds) {
          await this.enviarNotificacao(alunoId, `Novo aviso em ${turma.disciplina}`, post.conteudo.substring(0, 50) + '...', 'aviso');
        }
      }
    }
    return postRef;
  }

  private async enviarNotificacao(uid: string, titulo: string, mensagem: string, tipo: 'aviso' | 'atividade' | 'sistema') {
    try {
      await addDoc(collection(this.db, 'notificacoes'), {
        uidDestinatario: uid,
        titulo,
        mensagem,
        data: Timestamp.now(),
        lida: false,
        tipo
      });
    } catch (e) {
      console.error('Erro ao enviar notificação:', e);
    }
  }

  async excluirPost(turmaId: string, postId: string) {
    return deleteDoc(doc(this.db, 'turmas', turmaId, 'posts', postId));
  }

  getAtividadesRef(turmaId: string): Query<DocumentData> {
    return query(
      collection(this.db, 'turmas', turmaId, 'atividades'),
      orderBy('dataEntrega', 'asc'),
    );
  }

  async criarAtividade(turmaId: string, atividade: Atividade) {
    const ativRef = await addDoc(collection(this.db, 'turmas', turmaId, 'atividades'), {
      ...atividade,
      dataCriacao: Timestamp.now(),
    });

    const turma = await this.getTurmaById(turmaId);
    if (turma?.alunosIds) {
      for (const alunoId of turma.alunosIds) {
        await this.enviarNotificacao(alunoId, `Nova atividade: ${atividade.titulo}`, `Turma: ${turma.disciplina}`, 'atividade');
      }
    }
    return ativRef;
  }

  async excluirAtividade(turmaId: string, ativId: string) {
    return deleteDoc(doc(this.db, 'turmas', turmaId, 'atividades', ativId));
  }

  async entregarAtividade(turmaId: string, ativId: string, entrega: EntregaAtividade) {
    // Usa o ID do aluno como doc ID para manter uma única entrega por aluno
    const ref = doc(this.db, 'turmas', turmaId, 'atividades', ativId, 'entregas', entrega.alunoId);
    return setDoc(ref, {
      ...entrega,
      dataEntrega: Timestamp.now()
    });
  }

  getEntregasRef(turmaId: string, ativId: string): Query<DocumentData> {
    return query(
      collection(this.db, 'turmas', turmaId, 'atividades', ativId, 'entregas'), 
      orderBy('dataEntrega', 'desc')
    );
  }

  async removerAluno(turmaId: string, alunoId: string) {
    const turmaRef = doc(this.db, 'turmas', turmaId);
    const snap = await getDoc(turmaRef);
    if (snap.exists()) {
      const data = snap.data();
      const alunos = (data['alunos'] || []).filter((a: any) => a.uid !== alunoId);
      const ids = (data['alunosIds'] || []).filter((id: string) => id !== alunoId);
      await updateDoc(turmaRef, { alunos: alunos, alunosIds: ids });
    }
  }

  async excluirTurma(id: string) {
    const docRef = doc(this.db, 'turmas', id);
    await deleteDoc(docRef);
  }
}
