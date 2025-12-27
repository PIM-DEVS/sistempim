import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core'; // <--- Input aqui
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  // --- A LINHA QUE ESTAVA FALTANDO ---
  @Input() isOpen = true;
  // -----------------------------------

  @Output() navigate = new EventEmitter<string>();

  private authService = inject(AuthService);
  private router = inject(Router);

  dadosUsuario: any = null;

  menuItems = [
    { name: 'Home', icon: 'bx bx-home', route: '/home' },
    { name: 'Dashboard', icon: 'bx bx-grid-alt', route: '/dashboard' },
    { name: 'Exercise', icon: 'bx bx-book', route: '/exercise' },
    { name: 'Turmas', icon: 'bx bx-chalkboard', route: '/turmas' },
  ];

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.dadosUsuario = await this.authService.getDadosUsuario(user.uid);
      }
    });
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  }
}
