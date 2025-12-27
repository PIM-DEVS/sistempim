import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router'; // Import Router

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './profile.component.html',

  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);

  private cdr = inject(ChangeDetectorRef);

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  dadosUsuario: any = null;

  meuId: string = ''; // ID do usuário logado

  loading = true;

  isEditing = false;

  isMeuPerfil = false;

  isFollowing = false; // Estado do botão seguir

  novaCompetencia: string = '';

  editForm: any = {};

  notificacao: { mensagem: string; tipo: 'sucesso' | 'erro' | null } = { mensagem: '', tipo: null };

  ngOnInit() {
    // 1. Pega o usuário logado primeiro

    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.meuId = user.uid;

        // 2. Verifica a rota

        this.route.params.subscribe(async (params) => {
          this.loading = true;

          const userIdUrl = params['id'];

          if (userIdUrl && userIdUrl !== this.meuId) {
            // --- PERFIL DE OUTRA PESSOA ---

            this.isMeuPerfil = false;

            this.dadosUsuario = await this.authService.getDadosUsuario(userIdUrl);

            // Verifica se eu já sigo essa pessoa

            // (Supondo que no backend 'dadosUsuario.seguidores' seja um array de IDs)

            if (this.dadosUsuario.seguidores && this.dadosUsuario.seguidores.includes(this.meuId)) {
              this.isFollowing = true;
            } else {
              this.isFollowing = false;
            }
          } else {
            // --- MEU PERFIL ---

            this.isMeuPerfil = true;

            this.dadosUsuario = await this.authService.getDadosUsuario(this.meuId);

            if (!this.dadosUsuario?.genero) {
              this.isEditing = true;

              this.initEditForm();
            }
          }

          this.loading = false;

          this.cdr.detectChanges();
        });
      }
    });
  }

  // Lógica do botão SEGUIR

  async toggleFollow() {
    // 1. Seguranças básicas

    if (!this.meuId || !this.dadosUsuario?.uid) return;

    // Garante que o array existe

    if (!this.dadosUsuario.seguidores) {
      this.dadosUsuario.seguidores = [];
    }

    // 2. VERIFICAÇÃO REAL: O meu ID já está lá?

    const jaEstouSeguindo = this.dadosUsuario.seguidores.includes(this.meuId);

    if (jaEstouSeguindo) {
      // --- DEIXAR DE SEGUIR ---

      // Remove visualmente (filtra tudo que NÃO for meu ID)

      this.dadosUsuario.seguidores = this.dadosUsuario.seguidores.filter(
        (id: string) => id !== this.meuId,
      );

      this.isFollowing = false;

      this.mostrarAviso('Você deixou de seguir.', 'sucesso');

      // Atualiza banco

      await this.authService.unfollowUser(this.meuId, this.dadosUsuario.uid);
    } else {
      // --- SEGUIR ---

      // Adiciona visualmente

      this.dadosUsuario.seguidores.push(this.meuId);

      this.isFollowing = true;

      this.mostrarAviso('Seguindo!', 'sucesso');

      // Atualiza banco

      await this.authService.followUser(this.meuId, this.dadosUsuario.uid);
    }

    // 3. FORÇA A TELA ATUALIZAR O NÚMERO

    this.cdr.detectChanges();
  }

  irParaChat() {
    // Vai para o chat já com esse usuário selecionado (opcional passar ID na rota)

    this.router.navigate(['/chat'], { queryParams: { with: this.dadosUsuario.uid } });
  }

  // ... (Resto dos métodos: toggleEdit, adicionarCompetencia, salvarPerfil, etc. mantidos iguais) ...

  initEditForm() {
    this.editForm = {
      ...this.dadosUsuario,
      competencias: [...(this.dadosUsuario?.competencias || [])],
    };
  }

  // ... (getMemberSince, mostrarAviso) ...

  getMemberSince(date: any): string {
    if (!date) return '23/12/2025';

    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);

    return d.toLocaleDateString('pt-BR');
  }

  mostrarAviso(msg: string, tipo: 'sucesso' | 'erro') {
    this.notificacao = { mensagem: msg, tipo: tipo };

    this.cdr.detectChanges();

    setTimeout(() => {
      this.notificacao = { mensagem: '', tipo: null };
      this.cdr.detectChanges();
    }, 3000);
  }

  // ... métodos de adicionar/remover competencia ...

  toggleEdit() {
    if (!this.isMeuPerfil) return;

    this.isEditing = !this.isEditing;

    if (this.isEditing) this.initEditForm();

    this.cdr.detectChanges();
  }

  adicionarCompetencia() {
    if (this.novaCompetencia.trim()) {
      if (!this.editForm.competencias) this.editForm.competencias = [];

      this.editForm.competencias.push(this.novaCompetencia.trim());

      this.novaCompetencia = '';
    }
  }

  removerCompetencia(index: number) {
    this.editForm.competencias.splice(index, 1);
  }

  async salvarPerfil() {
    if (!this.meuId) return;

    try {
      // Chama o método corrigido do serviço
      await this.authService.updateProfileData(this.meuId, this.editForm);

      // Atualiza os dados na tela instantaneamente
      this.dadosUsuario = { ...this.dadosUsuario, ...this.editForm };

      this.isEditing = false;
      this.mostrarAviso('Perfil atualizado com sucesso!', 'sucesso');
    } catch (error) {
      console.error(error);
      this.mostrarAviso('Erro ao salvar perfil.', 'erro');
    }
  }
}
