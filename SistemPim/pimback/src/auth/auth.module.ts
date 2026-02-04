import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Importa o módulo do banco
import { JwtModule } from '@nestjs/jwt'; // Importa o módulo de Token

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: 'PIM-14611461', 
      signOptions: { expiresIn: '1d' }, 
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], 
})
export class AuthModule {}