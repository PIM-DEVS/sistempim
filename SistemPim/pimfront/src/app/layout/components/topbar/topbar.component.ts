import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, Notificacao } from '../../../core/services/notification.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private notifService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private eRef = inject(ElementRef);
  private router = inject(Router);

  dadosUsuario: any = null;
  notificacoes: Notificacao[] = [];
  menuPerfilAberto = false;
  menuNotificacoesAberto = false;

  // --- Propriedades da Busca ---
  searchTerm = '';
  resultadosBusca: any[] = [];
  buscando = false;
  private searchSubject = new Subject<string>();

  private subscricoes = new Subscription();

  get totalNaoLidas(): number {
    return this.notificacoes.filter((n) => !n.lida).length;
  }

  ngOnInit() {
    // 1. Lógica de Usuário
    const subUser = this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.dadosUsuario = await this.authService.getDadosUsuario(user.uid);
        this.carregarNotificacoes(user.uid);
        this.cdr.detectChanges(); // Garante atualização na carga inicial
      }
    });
    this.subscricoes.add(subUser);

    // 2. Lógica da Busca
    const subSearch = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(async (term) => {
        if (term.length >= 2) {
          this.buscando = true;
          this.cdr.detectChanges(); // Atualiza ícone de loading
          
          this.resultadosBusca = await this.authService.buscarUsuariosPorNome(term);
          
          this.buscando = false;
          this.cdr.detectChanges(); // Mostra resultados
        } else {
          this.resultadosBusca = [];
          this.cdr.detectChanges();
        }
      });
    this.subscricoes.add(subSearch);
  }

  ngOnDestroy() {
    this.subscricoes.unsubscribe();
  }

  // --- Ações de Busca ---
  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  irParaPerfil(uid: string) {
    this.resultadosBusca = [];
    this.searchTerm = '';
    this.router.navigate(['/profile', uid]);
    this.cdr.detectChanges();
  }

  // --- Funções Auxiliares ---
  carregarNotificacoes(uid: string) {
    const sub = this.notifService.getNotificacoes(uid).subscribe((res) => {
      this.notificacoes = res;
      this.cdr.detectChanges();
    });
    this.subscricoes.add(sub);
  }

  formatarTempo(timestamp: any): string {
    if (!timestamp) return '';
    const segundos = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);
    if (segundos < 60) return 'agora';
    if (segundos < 3600) return `${Math.floor(segundos / 60)} min atrás`;
    if (segundos < 86400) return `${Math.floor(segundos / 3600)} h atrás`;
    return timestamp.toDate().toLocaleDateString();
  }

  // --- Toggles com Detecção de Mudança Forçada (FIX DO BUG) ---
  togglePerfil() {
    this.menuPerfilAberto = !this.menuPerfilAberto;
    
    if (this.menuPerfilAberto) {
      this.menuNotificacoesAberto = false;
      this.resultadosBusca = []; 
    }
    
    // Força o Angular a renderizar o *ngIf
    this.cdr.detectChanges(); 
  }

  toggleNotificacoes() {
    this.menuNotificacoesAberto = !this.menuNotificacoesAberto;
    
    if (this.menuNotificacoesAberto) {
      this.menuPerfilAberto = false;
      this.resultadosBusca = [];
    }

    // Força o Angular a renderizar o *ngIf
    this.cdr.detectChanges();
  }

  marcarComoLida(id: string | undefined) {
    if (id) {
      this.notifService.marcarComoLida(id);
      // O subscribe das notificações deve atualizar a lista automaticamente, 
      // mas se não atualizar a cor na hora:
      this.cdr.detectChanges();
    }
  }

  marcarTodasComoLidas() {
    if (this.dadosUsuario?.uid) {
      this.notifService.marcarTodasLidas(this.dadosUsuario.uid);
    }
  }

  async logout() {
    await this.authService.logout();
  }

  // --- Listener Global para fechar ao clicar fora ---
  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    // Só executa lógica se tiver algum menu aberto (Performance)
    if (this.menuPerfilAberto || this.menuNotificacoesAberto || this.resultadosBusca.length > 0) {
      
      // Verifica se o clique foi fora do componente
      if (!this.eRef.nativeElement.contains(event.target)) {
        this.menuPerfilAberto = false;
        this.menuNotificacoesAberto = false;
        this.resultadosBusca = []; // Opcional: fecha busca também
        
        // Garante que o fechamento visual ocorra
        this.cdr.detectChanges();
      }
    }
  }
}