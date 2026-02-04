import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Função auxiliar para converter Array em String
  private formatSkills(skills: string[] | string | undefined): string {
    if (Array.isArray(skills)) {
      return skills.join(', '); // Converte ['Java', 'C'] em "Java, C"
    }
    return skills || '';
  }

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: '$2b$10$PlaceHolderPasswordHash...', 
        photoUrl: createUserDto.photoUrl,
        bio: createUserDto.bio,
        jobTitle: createUserDto.jobTitle,
        skills: this.formatSkills(createUserDto.skills), // <--- FIX
        role: 'STUDENT', // Padrão
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateByEmail(email: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.upsert({
      where: { email },
      update: {
        name: updateUserDto.name,
        photoUrl: updateUserDto.photoUrl,
        bio: updateUserDto.bio,
        jobTitle: updateUserDto.jobTitle,
        skills: this.formatSkills(updateUserDto.skills), // <--- FIX
      },
      create: {
        email: email,
        name: updateUserDto.name || 'Novo Usuário',
        password: '$2b$10$SyncPlaceholder...', 
        photoUrl: updateUserDto.photoUrl,
        bio: updateUserDto.bio,
        jobTitle: updateUserDto.jobTitle,
        skills: this.formatSkills(updateUserDto.skills), // <--- FIX
      },
    });
  }
}