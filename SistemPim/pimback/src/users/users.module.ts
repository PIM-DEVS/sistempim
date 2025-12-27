import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
// Não precisa importar o PrismaModule aqui se ele for @Global, 
// mas vamos deixar sem import explícito para testar o Global.

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}