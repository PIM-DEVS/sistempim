import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
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

  // Variável para controlar o Dropdown de opções
  menuAcoesAberto: boolean = false;

  editForm: any = {};
  novaCompetencia: string = '';
  notificacao: { mensagem: string; tipo: 'sucesso' | 'erro' | null } = { mensagem: '', tipo: null };

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.meuId = user.uid;

        this.route.params.subscribe(async (params) => {
          this.loading = true;
          // Reseta o menu ao trocar de perfil
          this.menuAcoesAberto = false; 
          
          const userIdUrl = params['id'];

          if (userIdUrl && userIdUrl !== this.meuId) {
            // --- PERFIL DE OUTRO ---
            this.isMeuPerfil = false;
            this.dadosUsuario = await this.authService.getDadosUsuario(userIdUrl);

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

  // --- LÓGICA DO MENU DROPDOWN ---
  toggleMenuAcoes(event: Event) {
    event.stopPropagation(); // Impede que o clique feche imediatamente
    this.menuAcoesAberto = !this.menuAcoesAberto;
    this.cdr.detectChanges();
  }

  // Fecha o menu se clicar em qualquer lugar fora dele
  @HostListener('document:click', ['$event'])
  fecharMenusSeClicarFora(event: Event) {
    if (this.menuAcoesAberto) {
      this.menuAcoesAberto = false;
      this.cdr.detectChanges();
    }
  }
  
  // Adicione essa função dentro da classe ProfileComponent

async compartilharPerfil() {
  // Fecha o menu para não atrapalhar
  this.menuAcoesAberto = false;
  this.cdr.detectChanges();

  const urlPerfil = window.location.href; // Pega a URL atual
  const textoCompartilhamento = `Confira o perfil de ${this.dadosUsuario.nome} no PIM!`;

  // Tenta usar o compartilhamento nativo do celular (Android/iOS)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Perfil PIM',
        text: textoCompartilhamento,
        url: urlPerfil
      });
      // Se deu certo, não precisa fazer mais nada
    } catch (err) {
      console.log('Usuário cancelou ou erro no share:', err);
    }
  } else {
    // FALLBACK: Se for PC ou navegador sem suporte, copia o Link
    try {
      await navigator.clipboard.writeText(urlPerfil);
      this.mostrarAviso('Link copiado para a área de transferência!', 'sucesso');
    } catch (err) {
      this.mostrarAviso('Erro ao copiar link.', 'erro');
    }
  }
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