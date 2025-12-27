import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // Importação necessária
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
  private route = inject(ActivatedRoute); // Injeção da rota ativa

  dadosUsuario: any = null;
  loading = true;
  isEditing = false;
  isMeuPerfil = false; // Nova flag para controle de botões
  novaCompetencia: string = '';
  editForm: any = {};
  notificacao: { mensagem: string; tipo: 'sucesso' | 'erro' | null } = { mensagem: '', tipo: null };

  ngOnInit() {
    // Escuta mudanças na URL (importante se você pesquisar alguém enquanto já estiver em um perfil)
    this.route.params.subscribe(async (params) => {
      this.loading = true;
      const userIdUrl = params['id'];

      if (userIdUrl) {
        // --- PERFIL DE TERCEIROS ---
        this.isMeuPerfil = false;
        const dados = await this.authService.getDadosUsuario(userIdUrl);
        this.dadosUsuario = dados;
        this.isEditing = false; // Não pode editar perfil alheio
        this.loading = false;
        this.cdr.detectChanges();
      } else {
        // --- MEU PERFIL (USUÁRIO LOGADO) ---
        this.authService.user$.subscribe(async (user) => {
          if (user) {
            this.isMeuPerfil = true;
            const dados = await this.authService.getDadosUsuario(user.uid);
            this.dadosUsuario = dados;

            // Abre edição se o perfil estiver incompleto
            if (!this.dadosUsuario?.genero) {
              this.isEditing = true;
              this.editForm = {
                ...this.dadosUsuario,
                competencias: [...(this.dadosUsuario?.competencias || [])],
              };
            }
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // Métodos de UI permanecem iguais, mas com a trava do isMeuPerfil
  toggleEdit() {
    if (!this.isMeuPerfil) return; // Segurança extra
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editForm = {
        ...this.dadosUsuario,
        competencias: [...(this.dadosUsuario?.competencias || [])],
      };
    }
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

  getMemberSince(date: any): string {
    if (!date) return '23/12/2025';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('pt-BR');
  }

  async salvarPerfil() {
    if (!this.isMeuPerfil || !this.dadosUsuario?.uid) return;
    this.loading = true;

    try {
      const dadosParaAtualizar = {
        nome: this.editForm.nome || this.dadosUsuario.nome || '',
        bio: this.editForm.bio || '',
        cargo: this.editForm.cargo || this.editForm.curso || '',
        foto: this.editForm.foto || this.dadosUsuario.foto || '',
        banner: this.editForm.banner || '',
        genero: this.editForm.genero || '',
        competencias: this.editForm.competencias || [],
      };

      await this.authService.updateProfileData(this.dadosUsuario.uid, dadosParaAtualizar);
      this.dadosUsuario = { ...this.dadosUsuario, ...dadosParaAtualizar };
      this.isEditing = false;
      this.mostrarAviso('Perfil atualizado com sucesso!', 'sucesso');
    } catch (error) {
      this.mostrarAviso('Erro ao salvar as alterações.', 'erro');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  mostrarAviso(msg: string, tipo: 'sucesso' | 'erro') {
    this.notificacao = { mensagem: msg, tipo: tipo };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.notificacao = { mensagem: '', tipo: null };
      this.cdr.detectChanges();
    }, 3000);
  }
}
