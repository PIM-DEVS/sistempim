import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { ToastService } from '../../core/services/toast.service';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private firestore = inject(Firestore);

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  currentUser: any = null;
  todos: any[] = [];
  todosFiltered: any[] = [];
  loadingUsers = true;
  termoBusca = '';

  chatAtivo: any = null;
  chatIdAtivo = '';
  mensagens$: Observable<any[]> = of([]);
  private mensagesSub: Subscription | null = null;

  mensagemAtual = '';
  enviando = false;

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.currentUser = user;
        await this.carregarTodosUsuarios(user.uid);
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.mensagesSub?.unsubscribe();
  }

  async carregarTodosUsuarios(meuUid: string) {
    this.loadingUsers = true;
    try {
      const snap = await getDocs(collection(this.firestore, 'users'));
      const followedIds = this.currentUser.seguindo || [];
      this.todos = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter((u: any) => u.uid !== meuUid && followedIds.includes(u.uid));
      this.todosFiltered = this.todos;
    } catch (e) {
      this.toast.error('Erro ao carregar usuários.');
    } finally {
      this.loadingUsers = false;
      this.cdr.detectChanges();
    }
  }

  filtrarUsuarios() {
    const termo = this.termoBusca.toLowerCase().trim();
    this.todosFiltered = termo
      ? this.todos.filter(u => (u.nome || u.name || '').toLowerCase().includes(termo))
      : this.todos;
  }

  async selecionarChat(contato: any) {
    if (this.chatAtivo?.uid === contato.uid) return;

    this.chatAtivo = contato;
    this.mensagens$ = of([]); // reset imediato
    this.mensagesSub?.unsubscribe();

    const chatId = this.chatService.getChatId(this.currentUser.uid, contato.uid);
    this.chatIdAtivo = chatId;
    this.cdr.detectChanges();

    try {
      // 1. Garante que o documento do chat existe no Firestore
      await this.chatService.criarChatSeNaoExistir(chatId);

      // 2. Só então ativa o listener de mensagens
      this.mensagens$ = this.chatService.getMensagens(chatId).pipe(
        tap(() => setTimeout(() => this.scrollToBottom(), 50)),
        catchError((err) => {
          console.error('Erro no listener de mensagens:', err);
          this.toast.error('Erro ao carregar mensagens: ' + (err?.message || ''));
          return of([]);
        })
      );
      this.cdr.detectChanges();
    } catch (err: any) {
      console.error('Erro ao criar/abrir chat:', err);
      this.toast.error('Não foi possível abrir o chat: ' + (err?.message || err?.code || ''));
    }
  }

  async enviarMensagem() {
    if (!this.mensagemAtual.trim() || !this.chatIdAtivo || this.enviando) return;
    const texto = this.mensagemAtual;
    this.mensagemAtual = '';
    this.enviando = true;
    try {
      await this.chatService.enviarMensagem(this.chatIdAtivo, texto, this.currentUser.uid, this.chatAtivo.uid);
    } catch (e: any) {
      this.mensagemAtual = texto;
      const msg = e?.message || 'Erro desconhecido';
      this.toast.error('Falha ao enviar: ' + msg);
      if (msg.includes('permission')) {
        this.toast.error('Dica: Verifique se suas Regras do Firestore foram publicadas.');
      }
    } finally {
      this.enviando = false;
    }
  }

  getNome(u: any): string {
    return u.nome || u.name || u.displayName || 'Usuário';
  }

  getFoto(u: any): string {
    return u.foto || u.photoUrl || u.photoURL || '';
  }

  getInitial(u: any): string {
    return this.getNome(u).charAt(0).toUpperCase();
  }

  isMyMessage(msg: any): boolean {
    return msg.senderId === this.currentUser?.uid;
  }

  formatTime(ts: any): string {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  scrollToBottom() {
    try { this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }
}