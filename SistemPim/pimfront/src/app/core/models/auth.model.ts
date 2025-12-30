export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface UserData {
  uid: string;
  email: string;
  nome?: string;
  role?: 'aluno' | 'professor' | 'admin';
  foto?: string;
  genero?: string;
  seguindo?: string[];
  seguidores?: string[];
}