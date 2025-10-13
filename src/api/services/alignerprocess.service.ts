import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AlignerProcessService {
  constructor(private readonly prismaService: PrismaService) {}
  async getAlignerProcess() {
    const process = await this.prismaService.alignerProcess.findMany();
    return process;
  }
  async getFirstAlignerProcess() {
    const process = await this.prismaService.alignerProcess.findFirst();
    return process;
  }

  async getAlignerProcessCount(): Promise<number> {
    const count = await this.prismaService.alignerProcess.count();
    return count;
  }

  async createAlignerProcess(videoUrl: string) {
    const process = await this.prismaService.alignerProcess.create({
      data: {
        videoUrl: videoUrl,
      },
    });
    return process;
  }
  async updateAlignerProcess(id: string, videoUrl: string) {
    const process = await this.prismaService.alignerProcess.update({
      where: {
        id: id,
      },
      data: {
        videoUrl: videoUrl,
      },
    });
    return process;
  }
}
