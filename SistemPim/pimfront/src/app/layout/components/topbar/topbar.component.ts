import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  OnDestroy,
  NgZone,
  Output,
  EventEmitter
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
  // Services
  private authService = inject(AuthService);
  private notifService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private eRef = inject(ElementRef);
  private router = inject(Router);
  private zone = inject(NgZone);

  @Output() toggleMenu = new EventEmitter<void>();

  // State
  dadosUsuario: any = null;
  notificacoes: Notificacao[] = [];
  
  // Dropdown States
  menuPerfilAberto = false;
  menuNotificacoesAberto = false;
  dropdownBuscaAberto = false;

  // Search State
  searchTerm = '';
  resultadosBusca: any[] = [];
  pesquisasRecentes: any[] = [];
  buscando = false;
  private searchSubject = new Subject<string>();
  private subscricoes = new Subscription();

  // Flag para impedir fechamento imediato
  private isToggling = false;

  get totalNaoLidas(): number {
    return this.notificacoes.filter((n) => !n.lida).length;
  }

  ngOnInit() {
    this.carregarHistorico();

    const subUser = this.authService.user$.subscribe(async (user) => {
      if (user) {
        // Garante que roda dentro da Zone do Angular
        this.zone.run(async () => {
          try {
            this.dadosUsuario = await this.authService.getDadosUsuario(user.uid);
            this.carregarNotificacoes(user.uid);
            this.cdr.detectChanges(); // Força atualização na inicialização
          } catch (e) {
            console.error('Erro ao carregar usuario', e);
          }
        });
      }
    });
    this.subscricoes.add(subUser);

    const subSearch = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(async (term) => {
        this.zone.run(() => {
          this.buscando = true;
          this.cdr.detectChanges();
        });

        if (term.length >= 2) {
          let resultados: any[] = [];
          try {
            resultados = await this.authService.buscarUsuariosPorNome(term);
          } catch (error) { console.error(error); }
          
          this.zone.run(() => {
            this.resultadosBusca = resultados;
            this.buscando = false;
            this.dropdownBuscaAberto = true;
            this.cdr.detectChanges();
          });
        } else {
          this.zone.run(() => {
            this.resultadosBusca = [];
            this.buscando = false;
            this.dropdownBuscaAberto = true;
            this.cdr.detectChanges();
          });
        }
      });
    this.subscricoes.add(subSearch);
  }

  ngOnDestroy() {
    this.subscricoes.unsubscribe();
  }

  // --- ACTIONS ---

  onMenuClick() {
    this.toggleMenu.emit();
  }

  // ==================================================================
  // SOLUÇÃO DO BUG DO DROPDOWN
  // ==================================================================

  togglePerfil(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Define flag para true para o HostListener ignorar este clique
    this.isToggling = true;

    // Fecha os outros
    this.menuNotificacoesAberto = false;
    this.dropdownBuscaAberto = false;

    // Alterna o estado
    this.menuPerfilAberto = !this.menuPerfilAberto;
    
    // Força o Angular a renderizar
    this.cdr.detectChanges();

    // Reseta a flag após um curto período
    setTimeout(() => {
      this.isToggling = false;
    }, 200);
  }

  toggleNotificacoes(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.isToggling = true;
    
    this.menuPerfilAberto = false;
    this.dropdownBuscaAberto = false;

    this.menuNotificacoesAberto = !this.menuNotificacoesAberto;
    
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isToggling = false;
    }, 200);
  }

  // ==================================================================

  onSearchFocus() {
    this.isToggling = true; // Impede fechar ao focar
    this.menuPerfilAberto = false;
    this.menuNotificacoesAberto = false;
    this.dropdownBuscaAberto = true;
    setTimeout(() => this.isToggling = false, 200);
  }

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
    if (this.searchTerm.length === 0) {
      this.dropdownBuscaAberto = true;
    }
  }

  irParaPerfil(user: any) {
    this.salvarNoHistorico(user);
    this.searchTerm = '';
    this.resultadosBusca = [];
    this.dropdownBuscaAberto = false;
    this.router.navigate(['/profile', user.uid]);
  }

  // --- HISTÓRICO ---
  carregarHistorico() {
    const salvo = localStorage.getItem('historicoBuscaPim');
    if (salvo) {
      try {
        this.pesquisasRecentes = JSON.parse(salvo);
      } catch (e) {
        this.pesquisasRecentes = [];
      }
    }
  }

  salvarNoHistorico(user: any) {
    // Remove duplicatas
    this.pesquisasRecentes = this.pesquisasRecentes.filter(u => u.uid !== user.uid);
    // Adiciona no início
    this.pesquisasRecentes.unshift(user);
    // Mantém apenas 5
    if (this.pesquisasRecentes.length > 5) this.pesquisasRecentes.pop();
    localStorage.setItem('historicoBuscaPim', JSON.stringify(this.pesquisasRecentes));
  }

  limparHistorico() {
    this.pesquisasRecentes = [];
    localStorage.removeItem('historicoBuscaPim');
    this.cdr.detectChanges();
  }

  // --- NOTIFICAÇÕES & AUTH ---

  carregarNotificacoes(uid: string) {
    this.notifService.getNotificacoes(uid).subscribe((res) => {
      this.zone.run(() => { 
        this.notificacoes = res; 
        this.cdr.detectChanges(); 
      });
    });
  }

  formatarTempo(timestamp: any): string {
    if (!timestamp) return '';
    try {
      // Verifica se é um objeto Timestamp do Firestore
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const segundos = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (segundos < 60) return 'agora';
      if (segundos < 3600) return `${Math.floor(segundos / 60)} min atrás`;
      if (segundos < 86400) return `${Math.floor(segundos / 3600)} h atrás`;
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  }

  marcarComoLida(id: string | undefined) {
    if (id) {
      this.notifService.marcarComoLida(id);
      // Atualiza localmente para feedback instantâneo
      const notif = this.notificacoes.find(n => n.id === id);
      if (notif) notif.lida = true;
    }
  }

  marcarTodasComoLidas() {
    if (this.dadosUsuario?.uid) {
      this.notifService.marcarTodasLidas(this.dadosUsuario.uid);
      this.notificacoes.forEach(n => n.lida = true);
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro no logout', error);
    }
  }

  // ==================================================================
  // LISTENER GLOBAL (FECHAR AO CLICAR FORA)
  // ==================================================================
  
  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    // 1. Se estivermos no meio de um toggle (clique no botão), IGNORA.
    if (this.isToggling) return;

    // 2. Verifica se o clique foi DENTRO do componente
    const clickedInside = this.eRef.nativeElement.contains(event.target);

    // 3. Se foi fora, fecha tudo.
    if (!clickedInside) {
      // Só dispara o detectChanges se algo estiver aberto para evitar processamento inútil
      if (this.menuPerfilAberto || this.menuNotificacoesAberto || this.dropdownBuscaAberto) {
        this.menuPerfilAberto = false;
        this.menuNotificacoesAberto = false;
        this.dropdownBuscaAberto = false;
        this.cdr.detectChanges();
      }
    }
  }
}