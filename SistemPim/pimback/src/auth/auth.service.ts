import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Usando Injeção de Dependência correta
import { CreateAuthDto } from './dto/create-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService // Necessário importar JwtModule no AuthModule
  ) {}

  // REGRA DE NEGÓCIO: Validação de Domínio agora fica no Back
  private validarDominio(email: string): boolean {
    const DOMINIO_ALUNO = 'aluno.ifal.edu.br';
    const DOMINIO_DOCENTE = 'ifal.edu.br';
    return email.includes(DOMINIO_ALUNO) || email.includes(DOMINIO_DOCENTE);
  }

  // LOGIN
  async login(email: string, pass: string) {
    // 1. Busca usuário
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 2. Compara a senha enviada com o hash no banco
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 3. Gera o Token JWT (O crachá de acesso)
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload), // Retorna o token pro Front
      user: { name: user.name, email: user.email, role: user.role }
    };
  }

  // CADASTRO (REGISTER)
  async register(createAuthDto: CreateAuthDto) {
    // 1. Valida Domínio
    if (!this.validarDominio(createAuthDto.email)) {
      throw new BadRequestException('Utilize seu email institucional (@ifal ou @aluno.ifal).');
    }

    // 2. Verifica se já existe
    const userExists = await this.prisma.user.findUnique({ where: { email: createAuthDto.email }});
    if (userExists) {
      throw new BadRequestException('Email já cadastrado.');
    }

    // 3. Criptografa a senha (Nunca salvar senha pura!)
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createAuthDto.password, salt);

    // 4. Define Role baseado no email
    const role = createAuthDto.email.includes('ifal.edu.br') && !createAuthDto.email.includes('aluno') 
      ? 'TEACHER' 
      : 'STUDENT';

    // 5. Salva no banco
    const user = await this.prisma.user.create({
      data: {
        email: createAuthDto.email,
        name: createAuthDto.name,
        password: hashedPassword,
        role: role as any, // Cast para o Enum do Prisma
      }
    });

    return { message: 'Usuário criado com sucesso!', userId: user.id };
  }
}