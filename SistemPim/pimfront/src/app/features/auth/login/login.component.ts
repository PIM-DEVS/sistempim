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

  async login() {
    try {
      const user = await this.authService.loginGoogle();

      if (user) {
        const dados: any = await this.authService.getDadosUsuario(user.uid);

        if (dados && dados['genero']) {
          this.router.navigate(['/dashboard']);
        } else {
          this.showGenderSelect = true;
        }
      }
    } catch (error) {
      console.error('Erro no login:', error);
    }
  }

  selectGender(gender: string) {
    this.selectedGender = gender;
  }

  async finalizarCadastro() {
    if (!this.selectedGender) return;

    // Pega o usuário que acabou de logar
    const user = this.auth.currentUser;

    if (user) {
      try {
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
