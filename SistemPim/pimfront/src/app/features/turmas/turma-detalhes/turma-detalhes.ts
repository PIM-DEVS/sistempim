import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TurmaService, PostMural, Atividade } from '../../../core/services/turma.service';
import { AuthService } from '../../../core/services/auth.service';
import { Turma } from '../../../core/models/turma.model';
import {
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';

@Component({
  selector: 'app-turma-detalhes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turma-detalhes.html', // Confirme o nome do arquivo
  styleUrls: ['./turma-detalhes.css'],
})
export class TurmaDetalhesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private turmaService = inject(TurmaService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  turma: Turma | undefined;
  posts: PostMural[] = [];
  atividades: Atividade[] = [];
  alunosDetalhes: any[] = [];

  loading = true;
  currentUser: any = null;
  isProfessor = false;
  abaAtiva: string = 'mural';

  // Controle de menu dropdown (evita erro de tipo)
  menuAbertoId: string | null | undefined = null;

  novoPostTexto = '';
  formAtividade = { titulo: '', descricao: '', data: '' };
  criandoAtividade = false;

  private subs: Unsubscribe[] = [];

  // Fecha menus ao clicar fora
  @HostListener('document:click')
  clickOut() {
    this.menuAbertoId = null;
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return this.voltar();

    this.authService.user$.subscribe(async (u) => {
      if (u) {
        const perfil = await this.authService.getDadosUsuario(u.uid);
        this.currentUser = {
          uid: u.uid,
          nome: perfil?.nome || u.displayName,
          photoURL: perfil?.foto || u.photoURL,
        };
        this.isProfessor = !u.email?.includes('@aluno');
      }
    });

    try {
      this.turma = await this.turmaService.getTurmaById(id);
      if (this.turma && this.turma.id) {
        this.iniciarListeners(this.turma.id);
        this.carregarDetalhesAlunos();
      } else {
        this.voltar();
      }
    } catch (e) {
      console.error(e);
      this.loading = false;
    }
  }

  iniciarListeners(turmaId: string) {
    const subPosts = onSnapshot(
      this.turmaService.getPostsRef(turmaId),
      (snap: QuerySnapshot<DocumentData>) => {
        this.posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PostMural);
        // Ordenação por data (decrescente)
        this.posts.sort((a, b) => {
          const dA = a.data instanceof Timestamp ? a.data.toDate() : new Date(a.data);
          const dB = b.data instanceof Timestamp ? b.data.toDate() : new Date(b.data);
          return dB.getTime() - dA.getTime();
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
    );

    const subAtiv = onSnapshot(
      this.turmaService.getAtividadesRef(turmaId),
      (snap: QuerySnapshot<DocumentData>) => {
        this.atividades = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Atividade);
        this.cdr.detectChanges();
      },
    );

    this.subs.push(subPosts, subAtiv);
  }

  async carregarDetalhesAlunos() {
    if (!this.turma?.alunos) return;
    this.alunosDetalhes = [];
    for (const uid of this.turma.alunos) {
      const idAluno = typeof uid === 'string' ? uid : (uid as any).uid;
      const dados = await this.authService.getDadosUsuario(idAluno);
      if (dados) this.alunosDetalhes.push({ uid: idAluno, ...dados });
    }
    this.cdr.detectChanges();
  }

  async publicar() {
    if (!this.novoPostTexto.trim() || !this.turma?.id || !this.currentUser) return;
    await this.turmaService.adicionarPost(this.turma.id, {
      autor: this.currentUser.nome,
      uidAutor: this.currentUser.uid,
      conteudo: this.novoPostTexto,
      data: new Date(),
      tipo: 'aviso',
      photoURL: this.currentUser.photoURL,
    });
    this.novoPostTexto = '';
  }

  async deletarPost(postId: string | undefined) {
    if (!postId || !this.turma?.id) return;
    if (confirm('Tem certeza que deseja excluir este aviso?')) {
      await this.turmaService.excluirPost(this.turma.id, postId);
    }
  }

  async salvarAtividade() {
    if (!this.formAtividade.titulo || !this.turma?.id) return;
    await this.turmaService.criarAtividade(this.turma.id, {
      titulo: this.formAtividade.titulo,
      descricao: this.formAtividade.descricao,
      dataEntrega: this.formAtividade.data ? new Date(this.formAtividade.data) : null,
      dataCriacao: new Date(),
    });
    this.criandoAtividade = false;
    this.formAtividade = { titulo: '', descricao: '', data: '' };
  }

  async deletarAtividade(ativId: string | undefined) {
    if (!ativId || !this.turma?.id) return;
    if (confirm('Excluir atividade?')) {
      await this.turmaService.excluirAtividade(this.turma.id, ativId);
    }
  }

  async removerAluno(alunoId: string) {
    if (!this.turma?.id) return;
    if (confirm('Remover aluno da turma?')) {
      await this.turmaService.removerAluno(this.turma.id, alunoId);
      this.alunosDetalhes = this.alunosDetalhes.filter((a) => a.uid !== alunoId);
    }
  }

  setAba(aba: string) {
    this.abaAtiva = aba;
  }
  voltar() {
    this.router.navigate(['/turmas']);
  }

  formatDate(val: any): string {
    if (!val) return 'Sem data';
    const date = val instanceof Timestamp ? val.toDate() : new Date(val);
    // Formatação curta e elegante
    return (
      date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' às ' +
      date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s());
  }
}
