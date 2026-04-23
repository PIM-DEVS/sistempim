import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurmaService } from '../../core/services/turma.service';
import { AuthService, AppUser } from '../../core/services/auth.service';

@Component({
  selector: 'app-exercise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercise.component.html',
  styleUrls: ['./exercise.component.css'],
})
export class ExerciseComponent implements OnInit {
  private turmaService = inject(TurmaService);
  private authService = inject(AuthService);

  exercicios: any[] = [];
  loading = true;
  isProfessor = false;
  userId = '';

  // Form states
  modalCriarAberto = false;
  novoExercicio = { titulo: '', descricao: '', turmaId: '', prazo: '' };
  minhasTurmas: any[] = [];

  ngOnInit() {
    this.authService.user$.subscribe(async (user: AppUser | null) => {
      if (user) {
        this.userId = user.uid;
        this.isProfessor = !user.email?.includes('@aluno');
        
        // Carrega turmas do usuário
        try {
          this.minhasTurmas = await (this.turmaService as TurmaService).getMinhasTurmas(this.userId, this.isProfessor);
          await this.carregarExercicios();
        } catch (e) {
          console.error(e);
        }
      }
      this.loading = false;
    });
  }

  async carregarExercicios() {
    // Simulação do carregamento, pois não temos a função pronta no turmaService ainda
    // Futuramente buscar do Firebase: this.turmaService.getExerciciosPorTurmas(...)
    setTimeout(() => {
      this.exercicios = [
        { id: 1, titulo: 'Lista de Equações', turmaNome: '3º Ano A - Matemática', prazo: 'Amanhã', concluido: false },
        { id: 2, titulo: 'Redação: Inteligência Artificial', turmaNome: '2º Ano B - Português', prazo: 'Sexta-feira', concluido: true },
      ];
    }, 500);
  }

  abrirModal() {
    this.modalCriarAberto = true;
  }
  
  fecharModal() {
    this.modalCriarAberto = false;
  }

  criarExercicio() {
    if (!this.novoExercicio.titulo || !this.novoExercicio.turmaId) return;
    
    // Simular a criação (seria um post no Firebase via TurmaService)
    const turmaEscolhida = this.minhasTurmas.find(t => t.id === this.novoExercicio.turmaId);
    
    this.exercicios.unshift({
      id: Date.now(),
      titulo: this.novoExercicio.titulo,
      turmaNome: turmaEscolhida ? `${turmaEscolhida.nome} - ${turmaEscolhida.disciplina}` : 'Geral',
      prazo: this.novoExercicio.prazo || 'Sem prazo',
      concluido: false
    });

    this.fecharModal();
    this.novoExercicio = { titulo: '', descricao: '', turmaId: '', prazo: '' };
  }
}
