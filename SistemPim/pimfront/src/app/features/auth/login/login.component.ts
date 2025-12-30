import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth'; 
import { FormsModule } from '@angular/forms';
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

  email = '';
  password = '';
  nome = '';

  private readonly DOMINIO_PROFESSOR = '@ifal.edu.br';
  private readonly DOMINIO_ALUNO = '@aluno.ifal.edu.br';

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Preencha todos os campos.';
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
        if (!this.nome) {
          this.errorMessage = 'Preencha seu nome.';
          this.loading = false;
          return;
        }
        const credential = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        user = credential.user;
        await updateProfile(user, { displayName: this.nome });
      }

      await this.validarAcesso(user);

    } catch (error: any) {
      this.handleAuthError(error.code);
    } finally {
      this.loading = false;
    }
  }

  async loginGoogle() {
    try {
      const user = await this.authService.loginGoogle();
      if (user) await this.validarAcesso(user);
    } catch (error) {
      this.errorMessage = 'Erro ao entrar com Google.';
    }
  }

  private async validarAcesso(user: any) {
    if (!user.email) return;

    const isProfessor = user.email.endsWith(this.DOMINIO_PROFESSOR);
    const isAluno = user.email.endsWith(this.DOMINIO_ALUNO);

    if (!isProfessor && !isAluno) {
      this.errorMessage = 'Email não autorizado. Use seu email institucional.';
      await this.authService.logout();
      return;
    }

    const role = isProfessor ? 'PROFESSOR' : 'ALUNO';
    const dadosAntigos = await this.authService.getDadosUsuario(user.uid);
    
    const novosDados: any = { uid: user.uid, email: user.email, role };
    if (this.nome) novosDados.nome = this.nome;

    await this.authService.updateProfileData(user.uid, novosDados);

    if (dadosAntigos && dadosAntigos['genero']) {
      this.router.navigate(['/dashboard']);
    } else {
      this.loading = false;
      this.showGenderSelect = true;
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

  private handleAuthError(code: string) {
    switch(code) {
      case 'auth/invalid-credential': this.errorMessage = 'Credenciais inválidas.'; break;
      case 'auth/user-not-found': this.errorMessage = 'Usuário não encontrado.'; break;
      case 'auth/wrong-password': this.errorMessage = 'Senha incorreta.'; break;
      case 'auth/email-already-in-use': this.errorMessage = 'Email já cadastrado.'; break;
      default: this.errorMessage = 'Ocorreu um erro. Tente novamente.';
    }
  }
}