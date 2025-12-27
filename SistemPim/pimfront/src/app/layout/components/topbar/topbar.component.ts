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
import { RouterModule, Router } from '@angular/router'; // Adicionado Router
import { FormsModule } from '@angular/forms'; // Adicionado para o input
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, Notificacao } from '../../../core/services/notification.service';
import { Subscription, Subject } from 'rxjs'; // Adicionado Subject
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'; // Adicionado operadores

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], // Adicionado FormsModule
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
    // 1. Lógica de Usuário e Notificações
    const subUser = this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.dadosUsuario = await this.authService.getDadosUsuario(user.uid);
        this.carregarNotificacoes(user.uid);
        this.cdr.detectChanges();
      }
    });
    this.subscricoes.add(subUser);

    // 2. Lógica da Busca em Tempo Real
    const subSearch = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(async (term) => {
        if (term.length >= 2) {
          this.buscando = true;
          this.cdr.detectChanges();
          this.resultadosBusca = await this.authService.buscarUsuariosPorNome(term);
          this.buscando = false;
          this.cdr.detectChanges();
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
  }

  // --- Restante das Funções (Notificações, Logout, etc) ---
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

  togglePerfil() {
    this.menuPerfilAberto = !this.menuPerfilAberto;
    if (this.menuPerfilAberto) {
      this.menuNotificacoesAberto = false;
      this.resultadosBusca = []; // Fecha busca ao abrir perfil
    }
  }

  toggleNotificacoes() {
    this.menuNotificacoesAberto = !this.menuNotificacoesAberto;
    if (this.menuNotificacoesAberto) {
      this.menuPerfilAberto = false;
      this.resultadosBusca = []; // Fecha busca ao abrir notif
    }
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
      this.menuPerfilAberto = false;
      this.menuNotificacoesAberto = false;
      this.resultadosBusca = []; // Fecha busca ao clicar fora
    }
  }
}
