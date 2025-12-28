import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  meuId: string = '';
  loading = true;
  isEditing = false;
  isMeuPerfil = false;
  isFollowing = false; 

  // ... outras variáveis (editForm, novaCompetencia, etc) ...
  editForm: any = {};
  novaCompetencia: string = '';
  notificacao: { mensagem: string; tipo: 'sucesso' | 'erro' | null } = { mensagem: '', tipo: null };


  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.meuId = user.uid;

        this.route.params.subscribe(async (params) => {
          this.loading = true;
          const userIdUrl = params['id'];

          if (userIdUrl && userIdUrl !== this.meuId) {
            // --- PERFIL DE OUTRO ---
            this.isMeuPerfil = false;
            this.dadosUsuario = await this.authService.getDadosUsuario(userIdUrl);

            // VERIFICAÇÃO CORRIGIDA: Usa 'seguidores' (Português)
            const listaSeguidores = this.dadosUsuario?.seguidores || [];
            this.isFollowing = listaSeguidores.includes(this.meuId);

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

  async toggleFollow() {
    if (!this.meuId || !this.dadosUsuario?.uid) return;

    // Garante que o array existe localmente
    if (!this.dadosUsuario.seguidores) this.dadosUsuario.seguidores = [];

    if (this.isFollowing) {
      // --- DEIXAR DE SEGUIR ---
      this.isFollowing = false;
      
      // Remove meu ID visualmente
      this.dadosUsuario.seguidores = this.dadosUsuario.seguidores.filter((id: string) => id !== this.meuId);
      
      this.mostrarAviso('Você deixou de seguir.', 'sucesso');
      
      // Chama o serviço (que já usa 'seguidores' e 'seguindo')
      await this.authService.unfollowUser(this.meuId, this.dadosUsuario.uid);

    } else {
      // --- SEGUIR ---
      this.isFollowing = true;
      
      // Adiciona meu ID visualmente
      this.dadosUsuario.seguidores.push(this.meuId);
      
      this.mostrarAviso('Seguindo!', 'sucesso');
      
      await this.authService.followUser(this.meuId, this.dadosUsuario.uid);
    }
    this.cdr.detectChanges();
  }

  irParaChat() {
    this.router.navigate(['/chat'], { queryParams: { with: this.dadosUsuario.uid } });
  }

  // ... Mantenha o restante dos métodos (initEditForm, salvarPerfil, etc) iguais ...
  initEditForm() {
    this.editForm = { ...this.dadosUsuario, competencias: [...(this.dadosUsuario?.competencias || [])] };
  }
  
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
    try {
      await this.authService.updateProfileData(this.meuId, this.editForm);
      this.dadosUsuario = { ...this.dadosUsuario, ...this.editForm };
      this.isEditing = false;
      this.mostrarAviso('Salvo com sucesso!', 'sucesso');
    } catch (e) { console.error(e); }
  }

  mostrarAviso(msg: string, tipo: any) {
    this.notificacao = { mensagem: msg, tipo: tipo };
    this.cdr.detectChanges();
    setTimeout(() => { this.notificacao = { mensagem: '', tipo: null }; this.cdr.detectChanges(); }, 3000);
  }
  
  getMemberSince(date: any): string {
    if (!date) return 'Data desconhecida';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('pt-BR');
  }
}