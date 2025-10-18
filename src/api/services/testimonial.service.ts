import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TestimonialDto } from '../dto/testimonial.dto';

@Injectable()
export class TestimonialService {
  private readonly logger = new Logger(TestimonialService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getTestimonials() {
    try {
      return await this.prismaService.testimonial.findMany();
    } catch (error) {
      this.logger.error('Error fetching testimonials', error.stack);
      throw new InternalServerErrorException('Failed to fetch testimonials');
    }
  }

  async createTestimonial(testimonialDto: {
    name: string;
    imageUrl: string;
    message: string;
  }) {
    try {
      return await this.prismaService.testimonial.create({
        data: testimonialDto,
      });
    } catch (error) {
      this.logger.error('Error creating testimonial', error.stack);
      throw new InternalServerErrorException('Failed to create testimonial');
    }
  }

  async updateTestimonial(
    id: string,
    testimonialDto: {
      name?: string;
      imageUrl?: string;
      message?: string;
    },
  ) {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating testimonial with id ${id}`, error.stack);
      throw new InternalServerErrorException('Failed to update testimonial');
    }
  }

  async deleteTestimonial(id: string) {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting testimonial with id ${id}`, error.stack);
      throw new InternalServerErrorException('Failed to delete testimonial');
    }
  }
}