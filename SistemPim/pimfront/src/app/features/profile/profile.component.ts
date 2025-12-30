import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);

  user: any = null;
  loading = true;

  // Dados simulados para visualização (enquanto não vem do banco)
  stats = {
    seguidores: 120,
    seguindo: 45,
    projetos: 8
  };

  competencias = [
    'Angular', 'TypeScript', 'Firebase', 'CSS3', 'UI Design'
  ];

  async ngOnInit() {
    try {
      const currentUser = this.auth.currentUser;
      
      if (currentUser) {
        // Tenta buscar dados completos no Firestore
        this.user = await this.authService.getDadosUsuario(currentUser.uid);
        
        // Se não tiver perfil completo, usa dados básicos do Google/Auth
        if (!this.user) {
          this.user = {
            nome: currentUser.displayName,
            email: currentUser.email,
            foto: currentUser.photoURL,
            uid: currentUser.uid
          };
        }
      } else {
        // Se não tiver usuário logado, volta pro login
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.authService.logout();
  }

  editarPerfil() {
    console.log("Botão editar clicado");
    // Futuramente abrir modal de edição
  }
}