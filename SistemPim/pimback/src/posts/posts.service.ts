import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  // Cria post vinculando ao autor
  async create(createPostDto: CreatePostDto) {
    const author = await this.prisma.user.upsert({
      where: { email: createPostDto.userEmail },
      update: {
        name: createPostDto.userName,
        photoUrl: createPostDto.userPhoto,
      },
      create: {
        email: createPostDto.userEmail,
        name: createPostDto.userName || 'Usuário Novo',
        photoUrl: createPostDto.userPhoto || '',
        // FIX: Adicionamos a senha obrigatória aqui para o erro sumir
        password: '$2b$10$SocialLoginPlaceholderHashDoNotUse...', 
      },
    });

    return this.prisma.post.create({
      data: {
        content: createPostDto.content,
        authorId: author.id,
      },
      include: { author: true },
    });
  }

  // --- MÉTODOS ---
  findAll() {
    return this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: true },
    });
  }

  findOne(id: number) {
    return this.prisma.post.findFirst({
      where: { id: id.toString() },
      include: { author: true }
    });
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return this.prisma.post.update({
      where: { id: id.toString() },
      data: { content: updatePostDto.content },
    });
  }

  remove(id: number) {
    return this.prisma.post.delete({
      where: { id: id.toString() },
    });
  }
}