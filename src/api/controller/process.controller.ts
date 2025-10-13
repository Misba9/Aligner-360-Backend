import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { AlignerProcessDto } from '../dto/alignerprocess.dto';
import { AlignerProcessService } from '../services/alignerprocess.service';
import { ImageKitService } from '../services/imagekit.service';
import { AuthGuard, UserRole } from 'src/guards/auth.guard';
import { Roles } from 'src/guards/role.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';

interface ProcessResponse {
  success: boolean;
  message: string;
  data: any;
}

@Controller('process')
export class ProcessController {
  private readonly logger = new Logger(ProcessController.name);
  constructor(
    private readonly alignerProcessService: AlignerProcessService,
    private readonly imageKitService: ImageKitService,
  ) {}

  @Put('')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('videoFile', {
      limits: {
        fileSize: 1024 * 1024 * 200, // 200MB - consistent with validation
      },
      fileFilter: (req, file, callback) => {
        const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/webm'];
        if (allowedVideoTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Video file must be MP4, MPEG, or WebM'),
            false,
          );
        }
      },
    }),
  )
  async updateAlignerProcess(
    @Body(ValidationPipe) alignerProcessDto: AlignerProcessDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response<ProcessResponse>> {
    const startTime = Date.now();
    this.logger.log('Starting aligner process update/create operation');

    try {
      const videoFile = req.file;

      // Validate input - either file or URL must be provided
      if (!videoFile && !alignerProcessDto.videoUrl) {
        this.logger.warn(
          'Request rejected: Neither video file nor video URL provided',
        );
        throw new BadRequestException(
          'Either video file or video URL must be provided',
        );
      }

      this.logger.log(
        `Processing request with ${videoFile ? 'file upload' : 'video URL'}`,
      );

      // Get video URL from upload or DTO
      const videoUrl = await this.getVideoUrl(
        videoFile,
        alignerProcessDto.videoUrl,
      );

      // Handle process update or creation
      const process = await this.upsertAlignerProcess(videoUrl);

      // Determine if this was an update or create operation
      const existingProcessCount =
        await this.alignerProcessService.getAlignerProcessCount();
      const isUpdate = existingProcessCount > 0;
      const message = isUpdate
        ? 'Aligner process updated successfully'
        : 'Aligner process created successfully';

      const duration = Date.now() - startTime;
      this.logger.log(
        `Aligner process ${isUpdate ? 'updated' : 'created'} successfully in ${duration}ms`,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message,
        data: process,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Aligner process operation failed in ${duration}ms: ${error.message}`,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while processing the request',
      );
    }
  }
  private async getVideoUrl(
    videoFile: Express.Multer.File,
    dtoVideoUrl?: string,
  ): Promise<string> {
    if (videoFile) {
      this.logger.log(
        `Uploading video file: ${videoFile.originalname} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`,
      );

      // Additional validation for file buffer
      if (!videoFile.buffer || videoFile.buffer.length === 0) {
        throw new BadRequestException('Video file is empty or corrupted');
      }

      const uploadResult = await this.imageKitService.uploadFile(
        videoFile.buffer,
        videoFile.originalname,
        'process-videos',
        true,
        ['process', 'video'],
      );

      if (!uploadResult?.url) {
        throw new InternalServerErrorException('Failed to upload video file');
      }

      this.logger.log(`Video file uploaded successfully: ${uploadResult.url}`);
      return uploadResult.url;
    }

    if (!dtoVideoUrl) {
      throw new BadRequestException(
        'Video URL is required when no file is provided',
      );
    }

    this.logger.log(`Using provided video URL: ${dtoVideoUrl}`);
    return dtoVideoUrl;
  }
  private async upsertAlignerProcess(videoUrl: string) {
    const existingProcess =
      await this.alignerProcessService.getFirstAlignerProcess();

    if (existingProcess) {
      this.logger.log(
        `Updating existing aligner process with ID: ${existingProcess.id}`,
      );
      return await this.alignerProcessService.updateAlignerProcess(
        existingProcess.id,
        videoUrl,
      );
    } else {
      this.logger.log('Creating new aligner process');
      return await this.alignerProcessService.createAlignerProcess(videoUrl);
    }
  }

  @Get()
  async getAlignerProcess() {
    const process = await this.alignerProcessService.getFirstAlignerProcess();
    return {
      success: true,
      message: 'Aligner process retrieved successfully',
      data: process,
    };
  }
}
