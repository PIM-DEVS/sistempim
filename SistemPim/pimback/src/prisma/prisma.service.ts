import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Essa função roda assim que o Backend liga
  async onModuleInit() {
    await this.$connect(); // Conecta no Neon (Nuvem)
  }
}