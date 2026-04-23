export interface Turma {
  id?: string;
  codigo: string;
  nome: string; 
  disciplina: string;
  professor: string;
  professorId: string;
  professorPhoto?: string | null;
  sala?: string;
  horario?: string;
  cor?: string;
  alunos: any[];
  alunosIds: string[];
  createdAt?: any;
}
