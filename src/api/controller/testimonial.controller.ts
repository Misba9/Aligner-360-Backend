import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { TestimonialService } from '../services/testimonial.service';
import { ImageKitService } from '../services/imagekit.service';
import { TestimonialDto } from '../dto/testimonial.dto';
import { AuthGuard, UserRole } from 'src/guards/auth.guard';
import { Roles } from 'src/guards/role.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('testimonial')
export class TestimonialController {
  logger = new Logger(TestimonialController.name);
  constructor(
    private readonly testimonialService: TestimonialService,
    private readonly imageKitService: ImageKitService,
  ) {}

  @Get()
  async getTestimonials() {
    try {
      const testimonials = await this.testimonialService.getTestimonials();
      return {
        success: true,
        message: 'Testimonials retrieved successfully',
        data: testimonials,
      };
    } catch (error) {
      this.logger.error('Error in getTestimonials', error.stack);
      throw new InternalServerErrorException('Failed to retrieve testimonials');
    }
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 1024 * 1024 * 5, // 5MB - consistent with validation
      },
      fileFilter: (req, file, callback) => {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedImageTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Image file must be JPEG, PNG, or JPG'), false);
        }
      },
    }),
  )
  async createTestimonial(
    @Body(ValidationPipe) testimonialDto: TestimonialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const { name, message } = testimonialDto;

      if (!name || !message) {
        throw new BadRequestException('Name and message are required');
      }

      if (!file) {
        throw new BadRequestException('Image file is required');
      }

      const imageBuffer = file.buffer;

      const imageKitResponse = await this.imageKitService.uploadFile(
        imageBuffer,
        file.originalname,
        'testimonials-images',
        false,
        ['testimonial'],
      );
      
      if (!imageKitResponse?.url) {
        throw new InternalServerErrorException('Failed to upload image');
      }
      
      const testimonial = await this.testimonialService.createTestimonial({
        name,
        imageUrl: imageKitResponse.url,
        message,
      });
      
      return {
        success: true,
        message: 'Testimonial created successfully',
        data: testimonial,
      };
    } catch (error) {
      this.logger.error('Error in createTestimonial', error.stack);
      // Re-throw NestJS specific exceptions
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create testimonial');
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 1024 * 1024 * 5, // 5MB - consistent with validation
      },
      fileFilter: (req, file, callback) => {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedImageTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Image file must be JPEG, PNG, or JPG'), false);
        }
      },
    }),
  )
  async updateTestimonial(
    @Param('id') id: string,
    @Body(ValidationPipe) testimonialDto: TestimonialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const { name, message } = testimonialDto;

      let imageFile: string | null = null;
      if (file) {
        const imageBuffer = file.buffer;
        const fileName = new Date().toISOString() + '-' + file.originalname;

        const imageKitResponse = await this.imageKitService.uploadFile(
          imageBuffer,
          'testimonials',
          fileName,
          true,
          ['testimonial'],
        );
        if (!imageKitResponse?.url) {
          throw new InternalServerErrorException('Failed to upload image');
        }
        imageFile = imageKitResponse.url;
      }
      
      const testimonial = await this.testimonialService.updateTestimonial(id, {
        name,
        ...(!!imageFile && { imageUrl: imageFile, message }),
        message,
      });
      
      return {
        success: true,
        message: 'Testimonial updated successfully',
        data: testimonial,
      };
    } catch (error) {
      this.logger.error(`Error in updateTestimonial with id ${id}`, error.stack);
      // Re-throw NestJS specific exceptions
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update testimonial');
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard)
  async deleteTestimonial(@Param('id') id: string) {
    try {
      await this.testimonialService.deleteTestimonial(id);
      return {
        success: true,
        message: 'Testimonial deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error in deleteTestimonial with id ${id}`, error.stack);
      // Re-throw NestJS specific exceptions
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete testimonial');
    }
  }
}