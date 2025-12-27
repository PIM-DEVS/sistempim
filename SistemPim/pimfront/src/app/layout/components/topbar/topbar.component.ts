import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  OnDestroy,
  NgZone, // <--- IMPORTANTE
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
  private zone = inject(NgZone); // <--- INJEÇÃO DA CORREÇÃO

  dadosUsuario: any = null;
  notificacoes: Notificacao[] = [];
  
  // Controles de Menu
  menuPerfilAberto = false;
  menuNotificacoesAberto = false;
  dropdownBuscaAberto = false;

  // Busca e Histórico
  searchTerm = '';
  resultadosBusca: any[] = [];
  pesquisasRecentes: any[] = [];
  buscando = false;
  private searchSubject = new Subject<string>();
  private subscricoes = new Subscription();

  get totalNaoLidas(): number {
    return this.notificacoes.filter((n) => !n.lida).length;
  }

  ngOnInit() {
    this.carregarHistorico();

    // 1. Dados do Usuário (Com correção de Zone)
    const subUser = this.authService.user$.subscribe(async (user) => {
      if (user) {
        const dados = await this.authService.getDadosUsuario(user.uid);
        
        // A MÁGICA: Força a execução dentro do Angular
        this.zone.run(() => {
          this.dadosUsuario = dados;
          this.carregarNotificacoes(user.uid);
          this.cdr.detectChanges();
        });
      }
    });
    this.subscricoes.add(subUser);

    // 2. Busca (Com correção de Zone)
    const subSearch = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(async (term) => {
        if (term.length >= 2) {
          this.zone.run(() => { 
            this.buscando = true; 
            this.cdr.detectChanges();
          });
          
          let resultados = [];
          try {
            resultados = await this.authService.buscarUsuariosPorNome(term);
          } catch (error) {
            console.error(error);
          }
          
          // Volta para a zona do Angular para mostrar os resultados
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
            // Se limpou o texto, mostra o histórico se estiver focado
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

  // --- Histórico e Busca ---

  carregarHistorico() {
    const salvo = localStorage.getItem('historicoBuscaPim');
    if (salvo) {
      this.pesquisasRecentes = JSON.parse(salvo);
    }
  }

  salvarNoHistorico(user: any) {
    // Remove duplicados e adiciona no topo
    this.pesquisasRecentes = this.pesquisasRecentes.filter(u => u.uid !== user.uid);
    this.pesquisasRecentes.unshift(user);
    if (this.pesquisasRecentes.length > 5) this.pesquisasRecentes.pop(); // Limite de 5
    localStorage.setItem('historicoBuscaPim', JSON.stringify(this.pesquisasRecentes));
  }

  limparHistorico() {
    this.pesquisasRecentes = [];
    localStorage.removeItem('historicoBuscaPim');
    this.cdr.detectChanges();
  }

  onSearchFocus() {
    // Fecha outros menus e abre a busca
    this.menuPerfilAberto = false;
    this.menuNotificacoesAberto = false;
    this.dropdownBuscaAberto = true;
    this.cdr.detectChanges();
  }

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
    if (this.searchTerm.length === 0) {
      this.dropdownBuscaAberto = true; // Mantém aberto para ver recentes
    }
  }

  irParaPerfil(user: any) {
    this.salvarNoHistorico(user);
    this.searchTerm = '';
    this.resultadosBusca = [];
    this.dropdownBuscaAberto = false;
    
    this.router.navigate(['/profile', user.uid]);
    this.cdr.detectChanges();
  }

  // --- Toggles ---
  togglePerfil() {
    this.menuPerfilAberto = !this.menuPerfilAberto;
    if (this.menuPerfilAberto) {
      this.menuNotificacoesAberto = false;
      this.dropdownBuscaAberto = false;
    }
    this.cdr.detectChanges();
  }

  toggleNotificacoes() {
    this.menuNotificacoesAberto = !this.menuNotificacoesAberto;
    if (this.menuNotificacoesAberto) {
      this.menuPerfilAberto = false;
      this.dropdownBuscaAberto = false;
    }
    this.cdr.detectChanges();
  }

  // --- Outros ---
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
    const segundos = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);
    if (segundos < 60) return 'agora';
    if (segundos < 3600) return `${Math.floor(segundos / 60)} min atrás`;
    if (segundos < 86400) return `${Math.floor(segundos / 3600)} h atrás`;
    return timestamp.toDate().toLocaleDateString();
  }

  marcarComoLida(id: string | undefined) {
    if (id) this.notifService.marcarComoLida(id);
  }

  marcarTodasComoLidas() {
    if (this.dadosUsuario?.uid) this.notifService.marcarTodasLidas(this.dadosUsuario.uid);
  }

  async logout() {
    await this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      // Se clicar fora, fecha tudo
      this.menuPerfilAberto = false;
      this.menuNotificacoesAberto = false;
      this.dropdownBuscaAberto = false;
      this.cdr.detectChanges();
    }
  }
}