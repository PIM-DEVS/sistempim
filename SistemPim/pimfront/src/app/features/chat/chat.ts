import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private cdr = inject(ChangeDetectorRef); // INJEÇÃO ESSENCIAL PARA O BUG DE TELA

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUser: any = null;
  contatos: any[] = [];
  loadingContatos = true;

  chatAtivo: any = null;
  chatIdAtivo: string = '';
  mensagens$: Observable<any[]> | null = null;
  mensagemAtual: string = '';

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.currentUser = user;
        await this.carregarContatos(user.uid);
        this.verificarParametrosDeRota();
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  async carregarContatos(uid: string) {
    this.loadingContatos = true;
    this.cdr.detectChanges(); // Força atualização visual inicial

    try {
      const userData = await this.authService.getDadosUsuario(uid);
      
      if (userData) {
        // Busca exatamente o que está no banco, sem inventar
        const listaIds = userData['seguindo'] || [];

        if (listaIds.length === 0) {
          this.contatos = [];
        } else {
          const promises = listaIds.map(async (amigoId: string) => {
            const idLimpo = typeof amigoId === 'object' ? (amigoId as any).uid : amigoId;
            if (!idLimpo) return null;

            const amigoData = await this.authService.getDadosUsuario(idLimpo);
            
            // SE NÃO TIVER DADOS, RETORNA NULL (Zero dados falsos)
            if (!amigoData) return null;

            return {
                uid: idLimpo,
                // Pega exatamente o que está no banco. Se não tiver nome, fica vazio.
                nome: amigoData['nome'] || amigoData['displayName'], 
                fotoPerfil: amigoData['fotoPerfil'] || amigoData['foto'],
                email: amigoData['email']
            };
          });

          const resultados = await Promise.all(promises);
          this.contatos = resultados.filter(u => u !== null && u.uid !== uid);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
    } finally {
      this.loadingContatos = false;
      this.cdr.detectChanges(); // CORREÇÃO: Força o Angular a renderizar a lista
    }
  }

  verificarParametrosDeRota() {
    this.route.queryParams.subscribe(params => {
      if (params['with']) {
        const uidAlvo = params['with'];
        // Aguarda a lista de contatos estar pronta se necessário
        if (this.contatos.length > 0) {
             const contato = this.contatos.find(c => c.uid === uidAlvo);
             if (contato) this.selecionarChat(contato);
        }
      }
    });
  }

  selecionarChat(contato: any) {
    this.chatAtivo = contato;
    // Gera ID único baseado na ordem alfabética dos UIDs
    this.chatIdAtivo = this.chatService.getChatId(this.currentUser.uid, contato.uid);
    
    this.chatService.criarChatSeNaoExistir(this.chatIdAtivo);
    this.mensagens$ = this.chatService.getMensagens(this.chatIdAtivo);
    
    this.cdr.detectChanges(); // Atualiza a tela para mostrar a área de mensagens
    
    // Pequeno delay para garantir que o scroll role para baixo ao abrir
    setTimeout(() => this.scrollToBottom(), 100);
  }

  async enviarMensagem() {
    if (!this.mensagemAtual.trim() || !this.chatIdAtivo) return;
    
    const texto = this.mensagemAtual;
    this.mensagemAtual = ''; // Limpa input imediatamente para UX rápida

    try {
      await this.chatService.enviarMensagem(this.chatIdAtivo, texto, this.currentUser.uid);
      // Não precisa forçar update aqui pois o Observable mensagens$ fará isso automaticamente
      setTimeout(() => this.scrollToBottom(), 100);
    } catch (error) {
      console.error('Erro envio:', error);
      this.mensagemAtual = texto; // Devolve o texto em caso de erro
    }
  }

  // Helper para formatar data no HTML sem inventar dados
  formatarData(timestamp: any): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  }
}