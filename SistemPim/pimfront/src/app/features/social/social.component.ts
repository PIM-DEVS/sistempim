import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService, Post } from './social.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './social.component.html',
  styleUrls: ['./social.component.css'],
})
export class SocialComponent implements OnInit {
  private socialService = inject(SocialService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  posts: Post[] = [];
  dadosUsuario: any = {};
  novoPostTexto: string = '';
  imagemPreview: string | null = null;

  // Estados de carregamento para UX profissional
  loadingPost = false;
  initialLoading = true; // Controla o Skeleton Loader

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.authService.getDadosUsuario(user.uid).then((dados) => {
          this.dadosUsuario = dados;
        });
      }
    });

    this.socialService.getPosts().subscribe({
      next: (dados) => {
        this.posts = dados;
        this.initialLoading = false; // Desliga o esqueleto quando os dados chegam
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro fatal:', err);
        this.initialLoading = false;
      },
    });
  }

  selecionarImagem(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagemPreview = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  async publicar() {
    if (!this.dadosUsuario) return;
    this.loadingPost = true;
    try {
      await this.socialService.criarPost(
        this.novoPostTexto,
        this.dadosUsuario,
        this.imagemPreview || '',
      );
      this.novoPostTexto = '';
      this.imagemPreview = null;
    } catch (e) {
      console.error(e);
      alert('Erro ao postar. Tente novamente.');
    } finally {
      this.loadingPost = false;
      this.cdr.detectChanges();
    }
  }

  curtir(post: Post) {
    if (!this.dadosUsuario?.uid) return;
    const isLiked = post.likes.includes(this.dadosUsuario.uid);
    this.socialService.toggleLike(post.id, this.dadosUsuario.uid, isLiked);
  }

  async excluir(id: string) {
    if (confirm('Tem certeza?')) await this.socialService.excluirPost(id);
  }
}
