import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TurmaService } from '../../../core/services/turma.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.css',
})
export class MainContentComponent implements OnInit, OnDestroy {
  private turmaService = inject(TurmaService);
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sub = new Subscription();

  cursos: any[] = [];
  turmas: any[] = [];
  loading = true;
  uid = '';
  userName = '';
  isProfessor = false;

  totalCursos = 0;
  totalTurmas = 0;
  statusAluno = '—';

  ngOnInit() {
    const subUser = this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.uid = user.uid;
        this.userName = user.nome || user.displayName || user.name || 'Usuário';
        this.isProfessor = !user.email?.includes('@aluno');
        this.cdr.detectChanges();

        // Carrega dados em paralelo, com timeout de segurança
        await this.carregarDados();
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
    this.sub.add(subUser);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  async carregarDados() {
    this.loading = true;

    // Timeout de segurança: nunca fica travado no loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.statusAluno = 'Sem vínculos';
        this.cdr.detectChanges();
      }
    }, 4000);

    try {
      // Busca turmas e cursos em paralelo
      const [turmasData] = await Promise.all([
        this.turmaService.getMinhasTurmas(this.uid, this.isProfessor).catch(() => []),
      ]);

      this.turmas = turmasData || [];
      this.totalTurmas = this.turmas.length;
      this.statusAluno = this.totalTurmas > 0 ? 'Ativo' : 'Sem vínculos';
    } catch (e) {
      console.warn('Erro ao carregar dados do dashboard:', e);
      this.statusAluno = 'Sem vínculos';
    } finally {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    }

    // Cursos (separado, não bloqueia o render)
    this.dashboardService.getAllCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.totalCursos = cursos.length;
        this.cdr.detectChanges();
      },
      error: () => { this.cursos = []; }
    });
  }

  acessarTurma(id: string) {
    this.router.navigate(['/turmas', id]);
  }

  getCor(turma: any): string {
    return turma.cor || '#00713D';
  }
}