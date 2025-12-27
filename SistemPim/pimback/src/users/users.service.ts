import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste o caminho se necessário
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        photoUrl: createUserDto.photoUrl,
        bio: createUserDto.bio,
        jobTitle: createUserDto.jobTitle,
        skills: createUserDto.skills || [],
      },
    });
  }

  async findByEmail(email: string) {
  try {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    // Se o banco falhar por falta de coluna, retorna um objeto básico
    console.error("Banco desatualizado, retornando dados básicos");
    return { email, name: "Usuário", bio: "", skills: [], jobTitle: "" };
  }
}

  // Usamos UPSERT para garantir que salva mesmo se o usuário
  // logou via Firebase mas ainda não tem linha no Postgres
  async updateByEmail(email: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.upsert({
      where: { email },
      update: {
        name: updateUserDto.name,
        photoUrl: updateUserDto.photoUrl,
        bio: updateUserDto.bio,
        jobTitle: updateUserDto.jobTitle,
        skills: updateUserDto.skills,
      },
      create: {
        email: email,
        name: updateUserDto.name || 'Novo Usuário',
        photoUrl: updateUserDto.photoUrl,
        bio: updateUserDto.bio,
        jobTitle: updateUserDto.jobTitle,
        skills: updateUserDto.skills || [],
      },
    });
  }
}