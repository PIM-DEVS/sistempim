import { Component, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  // Injeções
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  // Variáveis
  isLoginMode = true;
  showGenderSelect = false;
  selectedGender = '';
  loading = false;
  errorMessage = '';

  // Modelo
  nome = '';
  email = '';
  password = '';

  // Domínios
  private readonly DOMINIO_ALUNO = 'aluno.ifal.edu.br';
  private readonly DOMINIO_DOCENTE = 'ifal.edu.br';

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.password = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    
    // CORREÇÃO 1: Limpeza de espaços (Resolve o erro 400)
    const emailLimpo = this.email.trim();
    const senhaLimpa = this.password;

    if (!emailLimpo || !senhaLimpa) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      return;
    }

    // CORREÇÃO 2: Logs para Debug (Olhe o console F12 se der erro)
    console.log('Tentando autenticar:', { 
      mode: this.isLoginMode ? 'Login' : 'Cadastro', 
      email: emailLimpo,
      tamSenha: senhaLimpa.length 
    });

    if (!this.validarDominio(emailLimpo)) {
      this.errorMessage = 'Utilize seu email institucional (@ifal ou @aluno.ifal).';
      return;
    }

    this.loading = true;

    try {
      let userCredential;

      if (this.isLoginMode) {
        // --- LOGIN ---
        userCredential = await signInWithEmailAndPassword(this.auth, emailLimpo, senhaLimpa);
      } else {
        // --- CADASTRO ---
        if (!this.nome) {
          this.errorMessage = 'Por favor, informe seu nome.';
          this.loading = false;
          return;
        }
        userCredential = await createUserWithEmailAndPassword(this.auth, emailLimpo, senhaLimpa);
        
        // Atualiza o nome no Firebase Auth
        if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: this.nome });
        }
      }

      console.log('Sucesso no Auth, verificando perfil...');
      await this.verificarPerfilUsuario(userCredential.user);

    } catch (error: any) {
      console.error('Erro Firebase:', error);
      
      // CORREÇÃO 3: Forçar a atualização da UI dentro do Zone
      // Isso resolve o bug de "ter que trocar a aba para aparecer o erro"
      this.ngZone.run(() => {
        this.loading = false;
        this.tratarErrosFirebase(error.code);
      });
    }
    // Nota: Não usamos 'finally' aqui para o loading=false porque 
    // se der sucesso, o loading deve continuar até o redirecionamento.
  }

  // Validação separada para reutilizar
  private validarDominio(email: string): boolean {
    return email.includes(this.DOMINIO_ALUNO) || email.includes(this.DOMINIO_DOCENTE);
  }

  async loginGoogle() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const user = await this.authService.loginGoogle();
      
      if (user) {
        const email = user.email || '';
        if (!this.validarDominio(email)) {
          this.errorMessage = 'Este email não pertence à instituição IFAL.';
          await this.authService.logout();
          this.loading = false;
          return;
        }
        await this.verificarPerfilUsuario(user);
      } else {
        this.loading = false;
      }
    } catch (error) {
      console.error('Erro Google:', error);
      this.ngZone.run(() => {
        this.errorMessage = 'Erro ao conectar com Google.';
        this.loading = false;
      });
    }
  }

  private async verificarPerfilUsuario(user: any) {
    try {
        const dadosUsuario = await this.authService.getDadosUsuario(user.uid);

        // CORREÇÃO 4: Navegação segura dentro do Zone
        this.ngZone.run(() => {
          this.loading = false;
          
          if (dadosUsuario && dadosUsuario['genero']) {
            this.router.navigate(['/dashboard']);
          } else {
            this.showGenderSelect = true;
            if (!this.nome && user.displayName) {
              this.nome = user.displayName;
            }
          }
        });
    } catch (e) {
        this.ngZone.run(() => {
            this.loading = false;
            this.errorMessage = "Erro ao buscar dados do usuário.";
        });
    }
  }

  selectGender(gender: string) {
    this.selectedGender = gender;
  }

  async finalizarCadastro() {
    if (!this.selectedGender) return;
    this.loading = true;

    const user = this.auth.currentUser;
    
    if (user) {
      try {
          await this.authService.updateProfileData(user.uid, {
            nome: this.nome || user.displayName,
            email: user.email,
            genero: this.selectedGender,
            role: user.email?.includes(this.DOMINIO_DOCENTE) ? 'PROFESSOR' : 'ALUNO'
          });

          this.ngZone.run(() => {
            this.loading = false;
            this.router.navigate(['/dashboard']);
          });
      } catch (error) {
          this.ngZone.run(() => {
            this.loading = false;
            this.errorMessage = "Erro ao salvar perfil.";
          });
      }
    }
  }

  private tratarErrosFirebase(code: string) {
    switch(code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        this.errorMessage = 'Email ou senha incorretos.';
        break;
      case 'auth/user-not-found':
        this.errorMessage = 'Conta não encontrada. Cadastre-se.';
        break;
      case 'auth/email-already-in-use':
        this.errorMessage = 'Email já cadastrado. Faça login.';
        this.isLoginMode = true; // Joga o usuário para o login automaticamente
        break;
      case 'auth/weak-password':
        this.errorMessage = 'Senha fraca (mínimo 6 caracteres).';
        break;
      case 'auth/network-request-failed':
        this.errorMessage = 'Funcionalidade em desenvolvimento ( Entre com o Google ).';
        break;
      case 'auth/invalid-email':
        this.errorMessage = 'O formato do email é inválido.';
        break;
      default:
        this.errorMessage = `Erro desconhecido: ${code}`;
    }
  }
}