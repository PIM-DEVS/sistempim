import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit {
  private route = inject(ActivatedRoute);

  contatos: any[] = [];
  chatAtivo: any = null;
  mensagemAtual: string = '';

  ngOnInit() {
    // 1. SIMULAÇÃO: Carrega contatos (Idealmente viria do array 'following' do AuthService)
    this.carregarContatos();

    // 2. Se veio do botão "Mensagem" do perfil, abre direto
    this.route.queryParams.subscribe(params => {
      if (params['with']) {
        const uidAlvo = params['with'];
        const contato = this.contatos.find(c => c.uid === uidAlvo);
        if (contato) {
          this.selecionarChat(contato);
        }
      }
    });
  }

  carregarContatos() {
    // Aqui você faria: this.authService.getFollowingUsers()...
    // Mock data para você ver funcionando agora:
    this.contatos = [
      { uid: '1', nome: 'Ana Clara', foto: null, online: true },
      { uid: '2', nome: 'Carlos Eduardo', foto: null, online: false },
      { uid: '3', nome: 'PIM Suporte', foto: null, online: true }
    ];
  }

  selecionarChat(contato: any) {
    this.chatAtivo = contato;
    // Aqui carregaria o histórico de mensagens
  }

  enviarMensagem() {
    if (!this.mensagemAtual.trim()) return;
    
    // Lógica visual apenas (adicionar ao array de msgs)
    console.log('Enviando para', this.chatAtivo.nome, ':', this.mensagemAtual);
    
    this.mensagemAtual = '';
  }
}