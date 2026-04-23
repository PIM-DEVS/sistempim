import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = true;
  @Output() navigate = new EventEmitter<string>();

  public authService = inject(AuthService);
  private router = inject(Router);
  private sub = new Subscription();

  dadosUsuario: any = null;
  userMenuOpen = false;

  menuItems = [
    { name: 'Dashboard', icon: 'bx bx-bar-chart-alt-2',   route: '/dashboard' },
    { name: 'Turmas',    icon: 'bx bx-chalkboard',        route: '/turmas'    },
    { name: 'Mural',     icon: 'bx bx-news',              route: '/social'    },
    { name: 'Chat',      icon: 'bx bx-message-square-dots',route: '/chat'     },
    { name: 'Exercícios',icon: 'bx bx-book-open',          route: '/exercise'  },
    { name: 'Perfil',    icon: 'bx bx-user',              route: '/profile'   },
  ];

  ngOnInit() {
    this.sub.add(
      this.authService.user$.subscribe((user) => {
        if (user) {
          this.dadosUsuario = user;
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  @HostListener('document:click')
  closeUserMenu() {
    this.userMenuOpen = false;
  }

  goToProfile() {
    this.userMenuOpen = false;
    this.router.navigate(['/profile']);
  }

  async logout() {
    this.userMenuOpen = false;
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  get primeiroNome(): string {
    const nome = this.dadosUsuario?.nome || this.dadosUsuario?.name || this.dadosUsuario?.displayName || 'Usuário';
    return nome.split(' ')[0];
  }

  get fotoUsuario(): string {
    return this.dadosUsuario?.foto || this.dadosUsuario?.photoUrl || '';
  }

  get defaultAvatar(): string {
    return this.dadosUsuario?.genero === 'Feminino'
      ? 'assets/images/feminino.jpg'
      : 'assets/images/masculino.jpg';
  }
}
