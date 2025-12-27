import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  doc,
  deleteDoc,
  getDoc,
  orderBy,
  Timestamp,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Turma } from '../models/turma.model';

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

@Injectable({
  providedIn: 'root',
})
export class TurmaService {
  private db = getFirestore(getApp());
  private turmasRef = collection(this.db, 'turmas');

  constructor() {}

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

  async adicionarPost(turmaId: string, post: PostMural) {
    return addDoc(collection(this.db, 'turmas', turmaId, 'posts'), {
      ...post,
      data: Timestamp.now(),
    });
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
    return addDoc(collection(this.db, 'turmas', turmaId, 'atividades'), {
      ...atividade,
      dataCriacao: Timestamp.now(),
    });
  }

  async excluirAtividade(turmaId: string, ativId: string) {
    return deleteDoc(doc(this.db, 'turmas', turmaId, 'atividades', ativId));
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
