import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
// A CORREÇÃO DO CAMINHO ESTÁ AQUI EMBAIXO:
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);

  isLoginMode = true;
  showGenderSelect = false;
  selectedGender = '';
  loading = false;
  errorMessage = '';

  nome = '';
  email = '';
  password = '';

  private readonly DOMINIO_ALUNO = '@aluno.ifal.edu.br';
  private readonly DOMINIO_PROFESSOR = '@ifal.edu.br';

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Preencha email e senha.';
      return;
    }
    if (!this.isLoginMode && !this.nome) {
      this.errorMessage = 'Preencha seu nome.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      let user;

      if (this.isLoginMode) {
        const credential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
        user = credential.user;
      } else {
        const credential = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        user = credential.user;
        await updateProfile(user, { displayName: this.nome });
      }
      await this.validarEProcessarUsuario(user);

    } catch (error: any) {
      console.error('Erro Auth:', error);
      this.tratarErros(error.code);
    } finally {
      this.loading = false;
    }
  }

  async loginGoogle() {
    try {
      const user = await this.authService.loginGoogle();
      if (user) {
        await this.validarEProcessarUsuario(user);
      }
    } catch (error: any) {
      console.error('Erro Google:', error);
      if (error.code === 'auth/network-request-failed') {
        this.errorMessage = 'Erro de conexão. Verifique sua internet.';
      }
    }
  }

  private async validarEProcessarUsuario(user: any) {
    if (!user || !user.email) return;

    const isProfessor = user.email.endsWith(this.DOMINIO_PROFESSOR);
    const isAluno = user.email.endsWith(this.DOMINIO_ALUNO);

    if (!isProfessor && !isAluno) {
      this.errorMessage = `Use um email institucional (${this.DOMINIO_ALUNO}).`;
      await this.authService.logout();
      return;
    }

    const role = isProfessor ? 'PROFESSOR' : 'ALUNO';
    const dadosExistentes = await this.authService.getDadosUsuario(user.uid);
    
    let dadosParaSalvar: any = {
      uid: user.uid,
      email: user.email,
      role: role
    };

    if (this.nome || user.displayName) {
      dadosParaSalvar.nome = this.nome || user.displayName;
    }

    await this.authService.updateProfileData(user.uid, dadosParaSalvar);

    if (dadosExistentes && dadosExistentes['genero']) {
      this.router.navigate(['/dashboard']); 
    } else {
      this.showGenderSelect = true;
    }
  }

  private tratarErros(code: string) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        this.errorMessage = 'Email ou senha incorretos.';
        break;
      case 'auth/email-already-in-use':
        this.errorMessage = 'Este email já tem conta. Tente entrar.';
        break;
      case 'auth/weak-password':
        this.errorMessage = 'A senha precisa ter pelo menos 6 caracteres.';
        break;
      case 'auth/network-request-failed':
        this.errorMessage = 'Erro de conexão com o servidor.';
        break;
      default:
        this.errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }

  selectGender(gender: string) {
    this.selectedGender = gender;
  }

  async finalizarCadastro() {
    if (!this.selectedGender) return;
    const user = this.auth.currentUser;
    if (user) {
      await this.authService.updateProfileData(user.uid, { genero: this.selectedGender });
      this.router.navigate(['/dashboard']);
    }
  }
}