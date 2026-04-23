import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sub = new Subscription();

  dadosUsuario: any = null;
  meuId: string = '';
  loading = true;
  isEditing = false;
  isMeuPerfil = false;
  isFollowing = false;

  editForm: any = {};
  novaCompetencia: string = '';
  notificacao: { mensagem: string; tipo: 'sucesso' | 'erro' | null } = { mensagem: '', tipo: null };

  ngOnInit() {
    const subUser = this.authService.user$.subscribe(async (user) => {
      if (!user) {
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      this.meuId = user.uid;

      const subRoute = this.route.params.subscribe(async (params) => {
        this.loading = true;
        this.cdr.detectChanges();

        const userIdUrl = params['id'];

        try {
          if (userIdUrl && userIdUrl !== this.meuId) {
            // Perfil de outro usuário
            this.isMeuPerfil = false;
            this.dadosUsuario = await this.authService.getDadosUsuario(userIdUrl);
            const seguidores = this.dadosUsuario?.seguidores || [];
            this.isFollowing = seguidores.includes(this.meuId);
          } else {
            // Meu próprio perfil — usa user$ diretamente para resposta instantânea
            this.isMeuPerfil = true;
            this.dadosUsuario = {
              ...user,
              uid: user.uid,
              id: user.uid,
              nome: user.nome || user.name || user.displayName || '',
              foto: user.foto || user.photoUrl || '',
              email: user.email,
            };

            // Busca dados complementares do Firestore em background
            this.authService.getPerfilPorUid(this.meuId).then((perfil) => {
              if (perfil) {
                this.dadosUsuario = { ...this.dadosUsuario, ...perfil, uid: this.meuId, id: this.meuId };
                this.cdr.detectChanges();
              }
            }).catch(() => {});
          }
        } catch (e) {
          console.error('Erro ao carregar perfil:', e);
        }

        this.loading = false;
        this.cdr.detectChanges();
      });
      this.sub.add(subRoute);
    });
    this.sub.add(subUser);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  async toggleFollow() {
    if (!this.meuId || !this.dadosUsuario?.uid) return;
    if (!this.dadosUsuario.seguidores) this.dadosUsuario.seguidores = [];

    if (this.isFollowing) {
      this.isFollowing = false;
      this.dadosUsuario.seguidores = this.dadosUsuario.seguidores.filter((id: string) => id !== this.meuId);
      this.mostrarAviso('Você deixou de seguir.', 'sucesso');
      await this.authService.unfollowUser(this.meuId, this.dadosUsuario.uid);
    } else {
      this.isFollowing = true;
      this.dadosUsuario.seguidores.push(this.meuId);
      this.mostrarAviso('Seguindo!', 'sucesso');
      await this.authService.followUser(this.meuId, this.dadosUsuario.uid);
    }
    this.cdr.detectChanges();
  }

  irParaChat() {
    this.router.navigate(['/chat'], { queryParams: { with: this.dadosUsuario.uid } });
  }

  initEditForm() {
    this.editForm = {
      ...this.dadosUsuario,
      competencias: [...(this.dadosUsuario?.competencias || [])]
    };
  }

  toggleEdit() {
    if (!this.isMeuPerfil) return;
    this.isEditing = !this.isEditing;
    if (this.isEditing) this.initEditForm();
    this.cdr.detectChanges();
  }

  adicionarCompetencia() {
    const comp = this.novaCompetencia.trim();
    if (comp) {
      if (!this.editForm.competencias) this.editForm.competencias = [];
      this.editForm.competencias.push(comp);
      this.novaCompetencia = '';
    }
  }

  removerCompetencia(index: number) {
    this.editForm.competencias.splice(index, 1);
  }

  async salvarPerfil() {
    try {
      await this.authService.updateProfileData(this.meuId, this.editForm);
      this.dadosUsuario = { ...this.dadosUsuario, ...this.editForm };
      this.isEditing = false;
      this.mostrarAviso('Salvo com sucesso! ✅', 'sucesso');
    } catch (e: any) {
      console.error('Erro ao salvar perfil:', e);
      if (e?.code === 'permission-denied') {
        this.mostrarAviso('Erro: Regras do Firestore bloqueando. Acesse console.firebase.google.com', 'erro');
      } else {
        this.mostrarAviso('Erro ao salvar. Tente novamente.', 'erro');
      }
    }
    this.cdr.detectChanges();
  }

  mostrarAviso(msg: string, tipo: any) {
    this.notificacao = { mensagem: msg, tipo };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.notificacao = { mensagem: '', tipo: null };
      this.cdr.detectChanges();
    }, 4000);
  }

  getMemberSince(date: any): string {
    if (!date) return 'Data desconhecida';
    try {
      const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return 'Data desconhecida';
    }
  }
}