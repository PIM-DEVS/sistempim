import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TurmaService } from '../../core/services/turma.service';
import { AuthService } from '../../core/services/auth.service';
import { Turma } from '../../core/models/turma.model';
import { filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turmas.html', // Verifique se o nome é turmas.component.html ou turmas.html
  styleUrls: ['./turmas.css'],
})
export class TurmasComponent implements OnInit {
  private turmaService = inject(TurmaService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // INJEÇÃO PARA CORRIGIR O BUG DO LOADING

  minhasTurmas: Turma[] = [];
  loading = true;

  userId: string = '';
  userName: string = '';
  userPhoto: string | null = null;
  isProfessor = false;

  menuAbertoId: string | null = null;
  modalCriarAberto = false;
  codigoInput = '';

  novaTurma = { nome: '', disciplina: '', sala: '', horario: '' };

  // Variável para a notificação (Toast)
  notificacao: { mensagem: string; tipo: 'sucesso' | 'erro' | null } = { mensagem: '', tipo: null };

  ngOnInit() {
    this.authService.user$
      .pipe(
        filter((u) => u !== null),
        switchMap(async (u) => {
          this.userId = u!.uid;
          const perfil = await this.authService.getDadosUsuario(this.userId);

          this.userName = perfil?.nome || u!.displayName || 'Usuário';
          this.userPhoto = perfil?.foto || u!.photoURL;
          this.isProfessor = !u!.email?.includes('@aluno');
          return this.userId;
        }),
        switchMap(() => this.turmaService.getMinhasTurmas(this.userId, this.isProfessor)),
      )
      .subscribe({
        next: (t) => {
          this.minhasTurmas = t;
          this.loading = false;
          this.cdr.detectChanges(); // FORÇA A TELA ATUALIZAR
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // --- FUNÇÃO DE NOTIFICAÇÃO (Igual ao Profile) ---
  mostrarAviso(msg: string, tipo: 'sucesso' | 'erro') {
    this.notificacao = { mensagem: msg, tipo: tipo };
    this.cdr.detectChanges(); // Atualiza a tela para mostrar o aviso

    setTimeout(() => {
      this.notificacao = { mensagem: '', tipo: null };
      this.cdr.detectChanges(); // Atualiza a tela para sumir o aviso
    }, 3000);
  }

  // --- AÇÕES ---

  async confirmarCriacao() {
    if (!this.novaTurma.nome || !this.novaTurma.disciplina) {
      this.mostrarAviso('Preencha pelo menos Nome e Disciplina', 'erro');
      return;
    }
    this.loading = true;

    try {
      await this.turmaService.criarTurma({
        nome: this.novaTurma.nome,
        disciplina: this.novaTurma.disciplina,
        sala: this.novaTurma.sala,
        horario: this.novaTurma.horario,
        professor: this.userName,
        professorId: this.userId,
        professorPhoto: this.userPhoto,
        cor: 'pim-gradient',
      });

      this.mostrarAviso('Turma criada com sucesso!', 'sucesso');
      this.fecharModalCriar();
      this.minhasTurmas = await this.turmaService.getMinhasTurmas(this.userId, this.isProfessor);
    } catch (e: any) {
      console.error(e);
      this.mostrarAviso('Erro ao criar turma.', 'erro');
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // CORRIGE O LOADING TRAVADO
    }
  }

  async entrarNaTurma() {
    if (!this.codigoInput.trim()) return;

    this.loading = true; // Mostra loading
    this.cdr.detectChanges(); // Garante que o loading apareça

    try {
      await this.turmaService.entrarNaTurma(this.codigoInput.trim(), this.userId, this.userName);

      this.codigoInput = '';
      this.mostrarAviso('Sucesso! Você entrou na turma.', 'sucesso');

      // Atualiza lista
      this.minhasTurmas = await this.turmaService.getMinhasTurmas(this.userId, this.isProfessor);
    } catch (error: any) {
      console.error(error);
      this.mostrarAviso(error.message || 'Erro ao entrar na turma.', 'erro');
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // CORRIGE O LOADING TRAVADO
    }
  }

  async excluirTurma(id: string | undefined, e: Event) {
    e.stopPropagation();
    if (!id || !confirm('Tem certeza que deseja excluir esta turma?')) return;

    this.loading = true;
    try {
      await this.turmaService.excluirTurma(id);
      this.minhasTurmas = this.minhasTurmas.filter((t) => t.id !== id);
      this.fecharMenu();
      this.mostrarAviso('Turma excluída.', 'sucesso');
    } catch (error) {
      console.error(error);
      this.mostrarAviso('Erro ao excluir turma.', 'erro');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  acessarSala(id: string | undefined) {
    if (id) this.router.navigate(['/turmas', id]);
  }

  abrirModalCriar() {
    this.modalCriarAberto = true;
  }
  fecharModalCriar() {
    this.modalCriarAberto = false;
    this.novaTurma = { nome: '', disciplina: '', sala: '', horario: '' };
  }
  toggleMenu(id: string | undefined, e: Event) {
    e.stopPropagation();
    this.menuAbertoId = this.menuAbertoId === id ? null : id || null;
  }
  fecharMenu() {
    this.menuAbertoId = null;
  }
}
