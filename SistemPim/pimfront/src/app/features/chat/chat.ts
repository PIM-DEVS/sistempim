import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';

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
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUser: any = null;
  contatos: any[] = [];
  loadingContatos = true;
  
  // Chat
  chatAtivo: any = null;
  chatIdAtivo: string = '';
  mensagens$: Observable<any[]> = of([]);
  mensagensSubscription: Subscription | null = null;
  
  mensagemAtual: string = '';
  termoBusca: string = '';
  enviando = false;
  erroPermissao = false; // Controla a faixa vermelha

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.currentUser = user;
        await this.carregarContatos(user.uid);
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.mensagensSubscription) this.mensagensSubscription.unsubscribe();
  }

  // --- LÓGICA ROBUSTA PARA CONTATOS E IMAGENS ---
  async carregarContatos(uid: string) {
    this.loadingContatos = true;
    try {
      const userData = await this.authService.getDadosUsuario(uid);
      
      if (userData && userData['seguindo']) {
        const listaIds = userData['seguindo'];
        
        const promises = listaIds.map(async (amigoId: any) => {
          const idLimpo = typeof amigoId === 'object' ? amigoId.uid : amigoId;
          if (!idLimpo) return null;
          
          const amigoData = await this.authService.getDadosUsuario(idLimpo);
          if (!amigoData) return null;

          // Tenta encontrar a foto em QUALQUER campo possível
          const fotoReal = amigoData['photoURL'] || amigoData['fotoPerfil'] || amigoData['foto'] || amigoData['avatar'] || null;

          return {
            uid: idLimpo,
            nome: amigoData['nome'] || amigoData['displayName'] || 'Usuário',
            // Define a foto. O HTML vai decidir o que fazer se for null.
            foto: fotoReal, 
            email: amigoData['email'],
            cargo: amigoData['role'] || 'Estudante'
          };
        });

        const resultados = await Promise.all(promises);
        this.contatos = resultados.filter(u => u !== null && u.uid !== uid);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      this.loadingContatos = false;
      this.cdr.detectChanges();
    }
  }

  get contatosFiltrados() {
    if (!this.termoBusca.trim()) return this.contatos;
    const termo = this.termoBusca.toLowerCase();
    return this.contatos.filter(c => c.nome.toLowerCase().includes(termo));
  }

  // --- SELEÇÃO DE CHAT ---
  selecionarChat(contato: any) {
    if (this.chatAtivo?.uid === contato.uid) return;

    this.chatAtivo = contato;
    this.chatIdAtivo = this.chatService.getChatId(this.currentUser.uid, contato.uid);
    this.erroPermissao = false;
    
    // 1. Garante que o chat existe
    this.chatService.criarChatSeNaoExistir(this.chatIdAtivo).then(() => {
      // 2. Carrega mensagens
      this.carregarMensagens();
    }).catch(err => {
      console.error("Erro ao criar sala:", err);
      // Se der erro aqui, geralmente é permissão
      this.erroPermissao = true;
    });
  }

  carregarMensagens() {
    this.mensagens$ = this.chatService.getMensagens(this.chatIdAtivo).pipe(
      tap(() => {
        setTimeout(() => this.scrollToBottom(), 100);
        this.erroPermissao = false; // Se carregou, a permissão está ok
      }),
      catchError(error => {
        console.error('ERRO DE PERMISSÃO:', error);
        this.erroPermissao = true;
        return of([]);
      })
    );
  }

  async enviarMensagem() {
    if (!this.mensagemAtual.trim() || !this.chatIdAtivo || this.enviando) return;
    
    const texto = this.mensagemAtual;
    this.mensagemAtual = ''; 
    this.enviando = true;

    try {
      await this.chatService.enviarMensagem(this.chatIdAtivo, texto, this.currentUser.uid);
    } catch (error) {
      console.error('Erro envio:', error);
      this.mensagemAtual = texto; // Devolve o texto pro input
      this.erroPermissao = true; // Mostra o banner vermelho
    } finally {
      this.enviando = false;
    }
  }

  // Se a imagem REAL (URL) quebrar (404), usamos um placeholder
  tratarErroImagem(event: any) {
    event.target.src = 'assets/images/user-placeholder.png'; // Garanta que essa imagem existe na pasta assets
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  formatarData(timestamp: any): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  }
}