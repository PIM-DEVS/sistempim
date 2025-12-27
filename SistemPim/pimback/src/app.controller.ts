import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- ROTA DE LOGIN (Temporária) ---
  @Post('auth/login')
  login(@Body() body: any) {
    console.log('Recebi um login:', body); // Vai aparecer no terminal do backend
    // Retorna um sucesso falso só para o front liberar o acesso
    return { 
      message: 'Login realizado com sucesso', 
      access_token: 'token-falso-123' 
    };
  }

  // --- ROTA DE CADASTRO (Temporária) ---
  // Caso você ainda não tenha criado o UsersController
  @Post('users')
  register(@Body() body: any) {
    console.log('Recebi um cadastro:', body);
    return { 
      message: 'Usuário cadastrado com sucesso',
      id: Math.floor(Math.random() * 1000)
    };
  }
}