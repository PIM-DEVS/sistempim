import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Serviços
import { TurmaService } from '../../../core/services/turma.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.css',
})
export class MainContentComponent implements OnInit {
  // Injeções
  private turmaService = inject(TurmaService);
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // <--- A MÁGICA: Força a tela a atualizar

  // Dados
  cursos: any[] = [];
  turmas: any[] = [];
  
  loading = true;
  uid = '';
  userName = ''; 
  isProfessor = false;

  // Stats
  totalCursos = 0;
  totalTurmas = 0;
  statusAluno = 'Carregando...';

  ngOnInit() {
    this.loading = true;
    
    // 1. Monitorar Autenticação
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.uid = user.uid;
        this.isProfessor = !user.email?.includes('@aluno');

        // --- A. BUSCAR NOME (Prioridade) ---
        try {
          const perfil = await this.authService.getDadosUsuario(this.uid);
          this.userName = perfil?.nome || user.displayName || 'Aluno';
        } catch (e) {
          this.userName = user.displayName || 'Aluno';
        }
        
        // FORÇA O NOME A APARECER AGORA
        this.cdr.detectChanges(); 

        // Inicia o resto dos dados
        this.carregarDados();
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async carregarDados() {
    // --- B. BUSCAR TURMAS (Seguro) ---
    try {
      const turmasData = await this.turmaService.getMinhasTurmas(this.uid, this.isProfessor);
      this.turmas = turmasData || [];
      this.totalTurmas = this.turmas.length;
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
    }
    
    // Atualiza a tela parcial (se as turmas chegarem antes dos cursos)
    this.cdr.detectChanges();

    // --- C. BUSCAR CURSOS (Com proteção contra erro) ---
    this.dashboardService.getAllCursos().subscribe({
      next: (cursos: any[]) => {
        this.cursos = cursos.filter((c: any) => JSON.stringify(c).includes(this.uid));
        this.totalCursos = this.cursos.length;
        this.finalizarLoading();
      },
      error: (err: any) => {
        console.warn('Erro ao buscar cursos, ignorando...', err);
        this.finalizarLoading();
      }
    });

    // --- D. TRAVA DE SEGURANÇA ---
    // Se o banco de dados falhar silenciosamente, destrava em 1.5 segundos
    setTimeout(() => {
      if (this.loading) {
        console.log('Timeout forçado para liberar a tela.');
        this.finalizarLoading();
      }
    }, 1500);
  }

  finalizarLoading() {
    this.loading = false;
    
    if (this.totalTurmas > 0 || this.totalCursos > 0) {
      this.statusAluno = 'Ativo';
    } else {
      this.statusAluno = 'Sem Vínculos';
    }

    // FORÇA ATUALIZAÇÃO FINAL (Garante que o loading suma)
    this.cdr.detectChanges();
  }

  acessarTurma(id: string) {
    this.router.navigate(['/turmas', id]);
  }

  getCor(turma: any): string {
    return turma.cor || '#00ce71';
  }
}