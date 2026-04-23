import { Component, inject, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  user
} from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  isLoginMode = true;
  showGenderSelect = false;
  selectedGender = '';
  nomePersonalizado = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  nome = '';
  email = '';
  password = '';

  private readonly DOMINIO_ALUNO = 'aluno.ifal.edu.br';
  private readonly DOMINIO_DOCENTE = 'ifal.edu.br';

  // ─── Marca se o usuário veio de um cadastro NOVO nesta sessão ────────────────
  private isNovoCadastro = false;

  async ngOnInit() {
    this.loading = true;
    user(this.auth).subscribe(async (u) => {
      if (u) {
        // Usuário já autenticado: verifica se é novo ou existente
        await this.decidirDestino(u, false);
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.password = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    const emailLimpo = this.email.trim();
    const senhaLimpa = this.password;

    if (!emailLimpo || !senhaLimpa) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      return;
    }

    if (!this.validarDominio(emailLimpo)) {
      this.errorMessage = 'Utilize seu email institucional (@ifal ou @aluno.ifal).';
      return;
    }

    this.loading = true;

    try {
      if (this.isLoginMode) {
        // ─── LOGIN: usuário existente → vai direto para o dashboard ──────────
        const cred = await signInWithEmailAndPassword(this.auth, emailLimpo, senhaLimpa);
        await this.decidirDestino(cred.user, false);
      } else {
        // ─── CADASTRO: novo usuário → mostra seleção de gênero ───────────────
        if (!this.nome) {
          this.errorMessage = 'Por favor, informe seu nome.';
          this.loading = false;
          return;
        }
        const cred = await createUserWithEmailAndPassword(this.auth, emailLimpo, senhaLimpa);
        if (cred.user) {
          await updateProfile(cred.user, { displayName: this.nome });
        }
        this.isNovoCadastro = true;
        await this.decidirDestino(cred.user, true);
      }
    } catch (error: any) {
      console.error('Erro Firebase:', error);
      this.ngZone.run(() => {
        this.loading = false;
        this.tratarErrosFirebase(error.code);
        this.cdr.detectChanges();
      });
    }
  }

  private validarDominio(email: string): boolean {
    return email.includes(this.DOMINIO_ALUNO) || email.includes(this.DOMINIO_DOCENTE);
  }

  async loginGoogle() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const fu = await this.authService.loginGoogle();

      if (fu) {
        const email = fu.email || '';
        if (!this.validarDominio(email)) {
          this.errorMessage = 'Este email não pertence à instituição IFAL.';
          await this.authService.logout();
          this.loading = false;
          return;
        }

        // Para Google: determina se é novo pelo tempo de criação da conta
        const isNovo = this.isContaNova(fu);
        await this.decidirDestino(fu, isNovo);
      } else {
        this.loading = false;
      }
    } catch (error) {
      console.error('Erro Google:', error);
      this.ngZone.run(() => {
        this.errorMessage = 'Erro ao conectar com Google. Tente novamente.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  // ─── LÓGICA PRINCIPAL DE DESTINO ─────────────────────────────────────────────
  // isNovoUsuario = true → mostra tela de gênero (primeiro acesso)
  // isNovoUsuario = false → vai direto para o dashboard
  private async decidirDestino(user: any, isNovoUsuario: boolean) {
    this.ngZone.run(() => {
      this.loading = false;

      if (isNovoUsuario) {
        // Novo usuário: precisa escolher o avatar/gênero
        this.showGenderSelect = true;
        if (!this.nome) {
          this.nome = user.displayName || '';
        }
      } else {
        // Usuário existente: vai direto para o dashboard
        this.router.navigate(['/dashboard']);
      }
      this.cdr.detectChanges();
    });
  }

  // ─── Determina se é um cadastro novo pela diferença de tempo ─────────────────
  // Conta criada há menos de 2 minutos = novo usuário
  private isContaNova(user: any): boolean {
    const creationTime = user?.metadata?.creationTime;
    if (!creationTime) return false;
    const created = new Date(creationTime).getTime();
    const agora = Date.now();
    const diffMinutos = (agora - created) / 1000 / 60;
    return diffMinutos < 2; // menos de 2 minutos = acabou de criar
  }

  selectGender(gender: string) {
    this.selectedGender = gender;
  }

  async finalizarCadastro() {
    if (!this.selectedGender) {
      this.errorMessage = 'Por favor, selecione um avatar para continuar.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    const firebaseUser = this.auth.currentUser;

    if (!firebaseUser) {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = 'Sessão expirada. Faça login novamente.';
        this.cdr.detectChanges();
      });
      return;
    }

    try {
      const nomeUsado = this.selectedGender === 'Outro' && this.nomePersonalizado.trim()
        ? this.nomePersonalizado.trim()
        : (this.nome || firebaseUser.displayName || '');
        
      const role = this.authService.getRoleByEmail(firebaseUser.email || '');

      await this.authService.updateProfileData(firebaseUser.uid, {
        nome: nomeUsado,
        email: firebaseUser.email,
        genero: this.selectedGender,
        role
      });

      this.ngZone.run(() => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
        this.cdr.detectChanges();
      });
    } catch (error: any) {
      console.error('[finalizarCadastro] Erro:', error);
      this.ngZone.run(() => {
        this.loading = false;
        if (error?.code === 'permission-denied') {
          this.errorMessage = 'Permissão negada. Configure as Regras do Firestore no console.firebase.google.com';
        } else {
          this.errorMessage = `Erro ao salvar: ${error?.message || 'Tente novamente.'}`;
        }
        this.cdr.detectChanges();
      });
    }
  }

  private tratarErrosFirebase(code: string) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        this.errorMessage = 'Email ou senha incorretos.';
        break;
      case 'auth/user-not-found':
        this.errorMessage = 'Conta não encontrada. Cadastre-se primeiro.';
        this.isLoginMode = false;
        break;
      case 'auth/email-already-in-use':
        this.errorMessage = 'Email já cadastrado. Faça login.';
        this.isLoginMode = true;
        break;
      case 'auth/weak-password':
        this.errorMessage = 'Senha fraca (mínimo 6 caracteres).';
        break;
      case 'auth/network-request-failed':
        this.errorMessage = 'Sem conexão. Verifique sua internet.';
        break;
      case 'auth/invalid-email':
        this.errorMessage = 'Formato de email inválido.';
        break;
      default:
        this.errorMessage = `Erro: ${code}`;
    }
  }
}