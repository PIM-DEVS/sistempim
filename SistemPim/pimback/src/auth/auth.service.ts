import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'; // Importa o Prisma
import { CreateAuthDto } from './dto/create-auth.dto';

const prisma = new PrismaClient(); // Conecta ao banco

@Injectable()
export class AuthService {
  
  // Função que recebe os dados e salva no banco
  async create(createAuthDto: CreateAuthDto) {
    console.log('Recebi um pedido de cadastro:', createAuthDto);

    try {
      // Tenta criar o usuário na tabela 'User'
      const user = await prisma.user.create({
        data: {
          email: createAuthDto.email,
          // Nota: Em produção, criptografaremos a senha depois.
          // Por enquanto, vamos focar em salvar o registro.
          name: createAuthDto.name, 
        }
      });
      return { message: 'Usuário criado com sucesso!', user };
    } catch (error) {
      console.error(error);
      throw new Error('Erro ao criar usuário. Email já existe?');
    }
  }

  findAll() {
    return prisma.user.findMany(); // Listar todos
  }
}