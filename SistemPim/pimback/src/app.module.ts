import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module'; // Import do arquivo acima
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    PrismaModule, // <--- OBRIGATÓRIO: Tem que estar em IMPORTS, não providers
    UsersModule, PostsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}