import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
// Pode usar 'Record<string, any>' se não quiser criar o DTO agora
import { CreateAuthDto } from './dto/create-auth.dto'; 

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    // Chama o novo método 'login' do Service
    return this.authService.login(signInDto.email, signInDto.password);
  }

  @Post('register')
  signUp(@Body() signUpDto: CreateAuthDto) {
    // Chama o novo método 'register' do Service
    return this.authService.register(signUpDto);
  }
}