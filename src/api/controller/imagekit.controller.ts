import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageKitService } from '../services/imagekit.service';
import { AuthGuard, UserRole } from 'src/guards/auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';

@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@Controller('image-kit')
export class ImageKitController {
  constructor(private readonly imagekitService: ImageKitService) {}

  /**
   * Upload a file to ImageKit
   */
  @Post('upload')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @Body('tags') tags?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!folder) {
      throw new BadRequestException('Folder is required');
    }
    const tagsArray = tags
      ? tags.split(',').map((tag) => tag.trim())
      : undefined;
    const uniqueFileName = true;

    return await this.imagekitService.uploadFile(
      file.buffer,
      file.originalname,
      folder,
      uniqueFileName,
      tagsArray,
    );
  }

  /**
   * Upload a file from URL
   */
  @Post('upload-from-url')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async uploadFromUrl(
    @Body('url') url: string,
    @Body('fileName') fileName: string,
    @Body('folder') folder?: string,
    @Body('useUniqueFileName') useUniqueFileName?: boolean,
    @Body('tags') tags?: string[],
  ) {
    if (!url || !fileName) {
      throw new BadRequestException('URL and fileName are required');
    }

    return await this.imagekitService.uploadFromUrl(
      url,
      fileName,
      folder,
      useUniqueFileName,
      tags,
    );
  }

  /**
   * Get file details by fileId
   */
  @Get('file/:fileId')
  async getFileDetails(@Param('fileId') fileId: string) {
    return await this.imagekitService.getFileDetails(fileId);
  }

  /**
   * List files with optional filters
   */
  @Get('files')
  async listFiles(
    @Query('skip') skip?: number,
    @Query('limit') limit?: number,
    @Query('searchQuery') searchQuery?: string,
    @Query('path') path?: string,
    @Query('tags') tags?: string,
  ) {
    const options = {
      skip: skip ? Number(skip) : undefined,
      limit: limit ? Number(limit) : undefined,
      searchQuery,
      path,
      tags,
    };

    return await this.imagekitService.listFiles(options);
  }

  /**
   * Delete a file by fileId
   */
  @Delete('file/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    return await this.imagekitService.deleteFile(fileId);
  }

  /**
   * Delete multiple files
   */
  @Delete('files')
  async deleteFiles(@Body('fileIds') fileIds: string[]) {
    if (!fileIds || fileIds.length === 0) {
      throw new BadRequestException('FileIds array is required');
    }

    return await this.imagekitService.deleteFiles(fileIds);
  }

  /**
   * Update file details
   */

  @Put('file/:fileId')
  async updateFileDetails(
    @Param('fileId') fileId: string,
    @Body()
    updateData: {
      tags?: string[];
      customCoordinates?: string;
      removeAITags?: string[];
    },
  ) {
    return await this.imagekitService.updateFileDetails(fileId, updateData);
  }

  /**
   * Generate authentication parameters for client-side upload
   */
  @Get('auth-params')
  getAuthenticationParameters(
    @Query('token') token?: string,
    @Query('expire') expire?: number,
  ) {
    return this.imagekitService.getAuthenticationParameters(
      token,
      expire ? Number(expire) : undefined,
    );
  }
}
