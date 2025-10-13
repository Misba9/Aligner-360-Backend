import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private readonly prismaService: PrismaService) {}

  async sendContactQuery(
    name: string,
    email: string,
    subject: string,
    message: string,
  ) {
    if (message && message.length > 500) {
      throw new BadRequestException('Message is too long');
    }
    const contact = await this.prismaService.contact.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });
    return contact;
  }
  async getContacts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      this.prismaService.contact.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc', // Assuming you have a createdAt field
        },
      }),
      this.prismaService.contact.count(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: contacts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext,
        hasPrev,
      },
    };
  }
}
