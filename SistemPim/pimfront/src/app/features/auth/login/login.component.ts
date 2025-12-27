import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);

  showGenderSelect = false;
  selectedGender = '';

  // Definição dos domínios permitidos
  private readonly DOMINIO_PROFESSOR = '@ifal.edu.br';
  private readonly DOMINIO_ALUNO = '@aluno.ifal.edu.br';

  async login() {
    try {
      // 1. Faz o login com Google
      const user = await this.authService.loginGoogle();

      if (user && user.email) {
        // 2. VERIFICAÇÃO DE DOMÍNIO (SEGURANÇA)
        const isProfessor = user.email.endsWith(this.DOMINIO_PROFESSOR);
        const isAluno = user.email.endsWith(this.DOMINIO_ALUNO);

        if (!isProfessor && !isAluno) {
          // Se não for nenhum dos dois, expulsa o usuário
          alert(`Acesso negado! Apenas e-mails institucionais (${this.DOMINIO_ALUNO} ou ${this.DOMINIO_PROFESSOR}) são permitidos.`);
          await this.authService.logout();
          return;
        }

        // 3. Define qual é o papel (role) do usuário
        const roleUsuario = isProfessor ? 'PROFESSOR' : 'ALUNO';

        // 4. Busca dados existentes no banco
        const dados: any = await this.authService.getDadosUsuario(user.uid);

        // Se o usuário ainda não tem o papel salvo no banco, salvamos agora
        if (!dados || !dados['role']) {
          await this.authService.updateProfileData(user.uid, { 
            role: roleUsuario,
            email: user.email 
          });
        }

        // 5. Verifica se já tem gênero cadastrado
        if (dados && dados['genero']) {
          this.router.navigate(['/dashboard']);
        } else {
          // Se não tiver gênero, mostra a tela de seleção
          this.showGenderSelect = true;
        }
      }
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao tentar fazer login. Tente novamente.');
    }
  }

  selectGender(gender: string) {
    this.selectedGender = gender;
  }

  async finalizarCadastro() {
    if (!this.selectedGender) return;

    const user = this.auth.currentUser;

    if (user) {
      try {
        // Salvamos o gênero. O "role" já foi garantido no passo anterior (login)
        await this.authService.updateProfileData(user.uid, {
          genero: this.selectedGender,
        });

        this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('Erro ao salvar gênero:', error);
      }
    } else {
      console.error('Usuário não encontrado. Tente logar novamente.');
    }
  }
}