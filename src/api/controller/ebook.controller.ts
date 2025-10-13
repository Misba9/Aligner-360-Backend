import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ValidationPipe,
  HttpStatus,
  Res,
  Patch,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { EbookService } from '../services/ebook.service';
import { ImageKitService } from '../services/imagekit.service';
import {
  CreateEbookDto,
  UpdateEbookDto,
  EbookQueryDto,
  PublishEbookDto,
} from '../dto/ebook.dto';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';

@Controller('ebooks')
export class EbookController {
  constructor(
    private readonly ebookService: EbookService,
    private readonly imagekitService: ImageKitService,
  ) {}
  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectID is a 24-character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // ==================== ADMIN ROUTES ====================
  /**
   * Create a new ebook (Admin only)
   * POST /api/v1/ebooks
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnailImage', maxCount: 1 },
      { name: 'pdf', maxCount: 1 },
    ]),
  )
  async createEbook(
    @Body(ValidationPipe) createEbookDto: CreateEbookDto,
    @UploadedFiles()
    files: {
      thumbnailImage: Express.Multer.File[];
      pdf: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Handle file uploads to ImageKit
      const uploadPromises = [];
      const uploadedFiles: any = {};

      if (!files.pdf || !files.thumbnailImage) {
        throw new BadRequestException(
          'Thumbnail image and PDF file are required',
        );
      }
      // Upload thumbnail image if provided
      if (files.thumbnailImage && files.thumbnailImage[0]) {
        const thumbnailFile = files.thumbnailImage[0];

        // Validate thumbnail image
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(thumbnailFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Thumbnail image must be JPEG, PNG, or WebP format',
          });
        }

        if (thumbnailFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Thumbnail image size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              thumbnailFile.buffer,
              thumbnailFile.originalname,
              'ebook-thumbnails',
              true,
              ['ebook', 'thumbnail'],
            )
            .then((result) => {
              uploadedFiles.thumbnailImage = result.url;
            }),
        );
      }

      // Upload PDF file if provided
      if (files.pdf && files.pdf[0]) {
        const pdfFile = files.pdf[0];

        // Validate PDF file
        if (pdfFile.mimetype !== 'application/pdf') {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'PDF file must be in PDF format',
          });
        }

        if (pdfFile.size > 50 * 1024 * 1024) {
          // 50MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'PDF file size must be less than 50MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              pdfFile.buffer,
              pdfFile.originalname,
              'ebook-pdfs',
              true,
              ['ebook', 'pdf'],
            )
            .then((result) => {
              uploadedFiles.pdf = result.url;
            }),
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Merge uploaded file URLs with the DTO
      const ebookDataWithFiles = {
        ...createEbookDto,
        ...uploadedFiles,
      };

      // Create the ebook
      const ebook = await this.ebookService.createEbook(
        ebookDataWithFiles,
        req.user.id,
      );

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Ebook created successfully',
        data: ebook,
      });
    } catch (error) {
      console.error('Error creating ebook:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create ebook',
      });
    }
  }

  /**
   * Get all ebooks with admin privileges (filtering, pagination, all statuses)
   * GET /api/v1/ebooks/admin
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAllEbooksAdmin(@Query() query: EbookQueryDto, @Res() res: Response) {
    const result = await this.ebookService.getAllEbooks(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Ebooks retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Get ebook statistics (Admin only)
   * GET /api/v1/ebooks/admin/statistics
   */
  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getEbookStatistics(@Res() res: Response) {
    const stats = await this.ebookService.getEbookStatistics();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Ebook statistics retrieved successfully',
      data: stats,
    });
  }
  /**
   * Update an ebook (Admin only)
   * PUT /api/v1/ebooks/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnailImage', maxCount: 1 },
      { name: 'pdf', maxCount: 1 },
    ]),
  )
  async updateEbook(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEbookDto: UpdateEbookDto,
    @UploadedFiles()
    files: {
      thumbnailImage?: Express.Multer.File[];
      pdf?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid course ID format',
        });
      }
      // Handle file uploads to ImageKit (similar to create method)
      const uploadPromises = [];
      const uploadedFiles: any = {};

      // Upload thumbnail image if provided
      if (files.thumbnailImage && files.thumbnailImage[0]) {
        const thumbnailFile = files.thumbnailImage[0];

        // Validate thumbnail image
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(thumbnailFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Thumbnail image must be JPEG, PNG, or WebP format',
          });
        }

        if (thumbnailFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Thumbnail image size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              thumbnailFile.buffer,
              thumbnailFile.originalname,
              'ebook-thumbnails',
              true,
              ['ebook', 'thumbnail'],
            )
            .then((result) => {
              uploadedFiles.thumbnailImage = result.url;
            }),
        );
      }

      // Upload PDF file if provided
      if (files.pdf && files.pdf[0]) {
        const pdfFile = files.pdf[0];

        // Validate PDF file
        if (pdfFile.mimetype !== 'application/pdf') {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'PDF file must be in PDF format',
          });
        }

        if (pdfFile.size > 50 * 1024 * 1024) {
          // 50MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'PDF file size must be less than 50MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              pdfFile.buffer,
              pdfFile.originalname,
              'ebook-pdfs',
              true,
              ['ebook', 'pdf'],
            )
            .then((result) => {
              uploadedFiles.pdf = result.url;
            }),
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Merge uploaded file URLs with the DTO
      const ebookDataWithFiles = {
        ...updateEbookDto,
        ...uploadedFiles,
      };

      // Update the ebook
      const ebook = await this.ebookService.updateEbook(
        id,
        ebookDataWithFiles,
        req.user.role,
        req.user.id,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Ebook updated successfully',
        data: ebook,
      });
    } catch (error) {
      console.error('Error updating ebook:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update ebook',
      });
    }
  }

  /**
   * Publish an ebook (Admin only)
   * PATCH /api/v1/ebooks/:id/publish
   */
  @Patch(':id/publish')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async publishEbook(
    @Param('id') id: string,
    @Body(ValidationPipe) publishEbookDto: PublishEbookDto,
    @Res() res: Response,
  ) {
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    const ebook = await this.ebookService.publishEbook(id, publishEbookDto);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Ebook published successfully',
      data: ebook,
    });
  }

  /**
   * Unpublish an ebook (Admin only)
   * PATCH /api/v1/ebooks/:id/unpublish
   */
  @Patch(':id/unpublish')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async unpublishEbook(@Param('id') id: string, @Res() res: Response) {
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    const ebook = await this.ebookService.unpublishEbook(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Ebook unpublished successfully',
      data: ebook,
    });
  }

  /**
   * Delete an ebook (Admin only)
   * DELETE /api/v1/ebooks/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async deleteEbook(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    const result = await this.ebookService.deleteEbook(
      id,
      req.user.role,
      req.user.id,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  }

  // ==================== PUBLIC ROUTES ====================

  /**
   * Get all published ebooks (Public access)
   * GET /api/v1/ebooks
   */
  @Get()
  async getPublishedEbooks(
    @Query() query: EbookQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.ebookService.getPublishedEbooks(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Published ebooks retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Search ebooks (Public access)
   * GET /api/v1/ebooks/search?q=searchterm
   */
  @Get('search')
  async searchEbooks(
    @Query('q') query: string,
    @Query() filters: EbookQueryDto,
    @Res() res: Response,
  ) {
    if (!query) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const ebooks = await this.ebookService.searchEbooks(query, filters);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: ebooks,
      query,
    });
  }

  @Get(':id/download')
  async downloadEbook(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    let userId: string | undefined;
    try {
      if (req.user) {
        userId = req.user.id;
      }
    } catch (error) {
      // User is not authenticated, continue as anonymous
    }

    const downloadInfo = await this.ebookService.downloadEbook(id, userId);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Download link retrieved successfully',
      data: downloadInfo,
    });
  }

  @Get(':id')
  async getEbookById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    const ebook = await this.ebookService.getEbookById(id);

    // Check if user can access this ebook
    let userRole: UserRole | undefined;
    try {
      const token = req.cookies?.access_token;
      if (token && req.user) {
        userRole = req.user.role;
      }
    } catch (error) {
      // User is not authenticated
    }

    // If ebook is not published and user is not admin, throw error
    if (ebook.status !== 'PUBLISHED' && userRole !== UserRole.ADMIN) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Ebook not found',
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Ebook retrieved successfully',
      data: ebook,
    });
  }
}
