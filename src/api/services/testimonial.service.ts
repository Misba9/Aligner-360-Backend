import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TestimonialDto } from '../dto/testimonial.dto';

@Injectable()
export class TestimonialService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTestimonials() {
    return await this.prismaService.testimonial.findMany();
  }
  async createTestimonial(testimonialDto: {
    name: string;
    imageUrl: string;
    message: string;
  }) {
    return await this.prismaService.testimonial.create({
      data: testimonialDto,
    });
  }

  async updateTestimonial(
    id: string,
    testimonialDto: {
      name?: string;
      imageUrl?: string;
      message?: string;
    },
  ) {
    const testimonial = await this.prismaService.testimonial.findUnique({
      where: {
        id,
      },
    });
    if (!testimonial) {
      throw new NotFoundException('Testimonial not found');
    }
    return await this.prismaService.testimonial.update({
      where: {
        id,
      },
      data: testimonialDto,
    });
  }
  async deleteTestimonial(id: string) {
    const testimonial = await this.prismaService.testimonial.findUnique({
      where: {
        id,
      },
    });

    if (!testimonial) {
      throw new NotFoundException('Testimonial not found');
    }
    return await this.prismaService.testimonial.delete({
      where: {
        id,
      },
    });
  }
}
