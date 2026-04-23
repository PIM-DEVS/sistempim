import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService, Post, Comentario } from './social.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

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
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  posts: Post[] = [];
  dadosUsuario: any = {};
  novoPostTexto = '';
  imagemPreview: string | null = null;
  loadingPost = false;
  initialLoading = true;

  // Comentários state
  comentariosAbertos: Record<string, boolean> = {};
  comentariosCache: Record<string, Comentario[]> = {};
  novoComentario: Record<string, string> = {};

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.dadosUsuario = user;
        this.authService.getDadosUsuario(user.uid).then((dados) => {
          if (dados) this.dadosUsuario = { ...user, ...dados };
          this.cdr.detectChanges();
        });
      }
    });

    this.socialService.getPosts().subscribe({
      next: (dados) => {
        this.posts = dados;
        this.initialLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.toast.error('Erro ao carregar o mural.');
        this.initialLoading = false;
        this.cdr.detectChanges();
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
    const user = this.authService.user$.value;
    if (!user || !this.novoPostTexto.trim()) return;
    this.loadingPost = true;
    try {
      const autor = this.dadosUsuario?.uid ? this.dadosUsuario : user;
      await this.socialService.criarPost(this.novoPostTexto, autor, this.imagemPreview || '');
      this.novoPostTexto = '';
      this.imagemPreview = null;
      this.toast.success('Publicado com sucesso!');
    } catch (e: any) {
      this.toast.error('Erro ao publicar: ' + (e?.message || ''));
    } finally {
      this.loadingPost = false;
      this.cdr.detectChanges();
    }
  }

  async curtir(post: Post) {
    if (!this.dadosUsuario?.uid) return;
    const isLiked = post.likes.includes(this.dadosUsuario.uid);
    try {
      await this.socialService.toggleLike(post.id, this.dadosUsuario.uid, isLiked);
    } catch { this.toast.error('Erro ao curtir.'); }
  }

  async salvar(post: Post) {
    if (!this.dadosUsuario?.uid) return;
    const isSalvo = post.salvos?.includes(this.dadosUsuario.uid);
    try {
      await this.socialService.toggleSalvar(post.id, this.dadosUsuario.uid, isSalvo || false);
      this.toast.success(isSalvo ? 'Post removido dos salvos.' : 'Post salvo!');
    } catch { this.toast.error('Erro ao salvar.'); }
  }

  toggleComentarios(postId: string) {
    this.comentariosAbertos[postId] = !this.comentariosAbertos[postId];
    if (this.comentariosAbertos[postId] && !this.comentariosCache[postId]) {
      this.socialService.getComentarios(postId).subscribe(cs => {
        this.comentariosCache[postId] = cs;
        this.cdr.detectChanges();
      });
    }
  }

  async enviarComentario(postId: string) {
    const texto = this.novoComentario[postId]?.trim();
    if (!texto || !this.dadosUsuario?.uid) return;
    try {
      await this.socialService.addComentario(postId, {
        texto,
        autorId: this.dadosUsuario.uid,
        autorNome: this.dadosUsuario.nome || this.dadosUsuario.name || 'Usuário',
        autorFoto: this.dadosUsuario.foto || this.dadosUsuario.photoUrl || '',
        criadoEm: null
      });
      this.novoComentario[postId] = '';
    } catch { this.toast.error('Erro ao comentar.'); }
  }

  async excluir(id: string) {
    if (confirm('Excluir este post?')) {
      await this.socialService.excluirPost(id);
      this.toast.success('Post excluído.');
    }
  }

  getMeuLike(post: Post): boolean {
    return post.likes.includes(this.dadosUsuario?.uid);
  }

  getMeuSalvo(post: Post): boolean {
    return post.salvos?.includes(this.dadosUsuario?.uid) || false;
  }

  formatTime(ts: any): string {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return 'agora';
      if (diff < 3600) return `${Math.floor(diff/60)}min`;
      if (diff < 86400) return `${Math.floor(diff/3600)}h`;
      return d.toLocaleDateString('pt-BR');
    } catch { return ''; }
  }
}
