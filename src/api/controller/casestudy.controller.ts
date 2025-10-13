import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  HttpStatus,
  Res,
  Req,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import {
  CaseStudyService,
  CaseStudyQueryDto,
} from '../services/casestudy.service';
import {
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  Gender,
} from '../dto/casestudy.dto';
import { ImageKitService } from '../services/imagekit.service';
import { AuthGuard, UserRole } from 'src/guards/auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';

@Controller('case-studies')
export class CaseStudyController {
  constructor(
    private readonly caseStudyService: CaseStudyService,
    private readonly imagekitService: ImageKitService,
  ) {}

  // Helper method to validate MongoDB ObjectID
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // ==================== ADMIN ROUTES ====================

  /**
   * Create a new case study (Admin only)
   * POST /api/v1/case-studies
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imageBefore', maxCount: 1 },
      { name: 'imageAfter', maxCount: 1 },
    ]),
  )
  async createCaseStudy(
    @Body(ValidationPipe) createCaseStudyDto: CreateCaseStudyDto,
    @UploadedFiles()
    files: {
      imageBefore?: Express.Multer.File[];
      imageAfter?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Validate required files
      if (!files?.imageBefore || !files?.imageAfter) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Both imageBefore and imageAfter files are required',
        });
      }

      // Handle file uploads to ImageKit
      const uploadPromises = [];
      const uploadedFiles: any = {};

      // Upload imageBefore
      if (files.imageBefore && files.imageBefore[0]) {
        const imageBeforeFile = files.imageBefore[0];

        // Validate image file
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(imageBeforeFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageBefore must be JPEG, PNG, or WebP format',
          });
        }

        if (imageBeforeFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageBefore size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              imageBeforeFile.buffer,
              imageBeforeFile.originalname,
              'case-studies/before',
              true,
              ['case-study', 'before'],
            )
            .then((result) => {
              uploadedFiles.imageBefore = result.url;
            }),
        );
      }

      // Upload imageAfter
      if (files.imageAfter && files.imageAfter[0]) {
        const imageAfterFile = files.imageAfter[0];

        // Validate image file
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(imageAfterFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageAfter must be JPEG, PNG, or WebP format',
          });
        }

        if (imageAfterFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageAfter size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              imageAfterFile.buffer,
              imageAfterFile.originalname,
              'case-studies/after',
              true,
              ['case-study', 'after'],
            )
            .then((result) => {
              uploadedFiles.imageAfter = result.url;
            }),
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Create case study with uploaded image URLs
      const caseStudyData = {
        ...createCaseStudyDto,
        imageBefore: uploadedFiles.imageBefore,
        imageAfter: uploadedFiles.imageAfter,
      };

      const caseStudy =
        await this.caseStudyService.createCaseStudy(caseStudyData);

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Case study created successfully',
        data: caseStudy,
      });
    } catch (error) {
      console.error('Create case study error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create case study',
      });
    }
  }
  /**
   * Get all case studies with filtering (Admin only)
   * GET /api/v1/case-studies/admin
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAllCaseStudiesAdmin(
    @Query() query: CaseStudyQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.caseStudyService.getAllCaseStudies(query);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Case studies retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get case studies admin error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve case studies',
      });
    }
  }

  /**
   * Update case study (Admin only)
   * PUT /api/v1/case-studies/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imageBefore', maxCount: 1 },
      { name: 'imageAfter', maxCount: 1 },
    ]),
  )
  async updateCaseStudy(
    @Param('id') id: string,
    @Body(ValidationPipe) updateCaseStudyDto: UpdateCaseStudyDto,
    @UploadedFiles()
    files: {
      imageBefore?: Express.Multer.File[];
      imageAfter?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid case study ID format',
        });
      }

      // Handle file uploads to ImageKit if new files are provided
      const uploadPromises = [];
      const uploadedFiles: any = {};

      // Upload imageBefore if provided
      if (files?.imageBefore && files.imageBefore[0]) {
        const imageBeforeFile = files.imageBefore[0];

        // Validate image file
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(imageBeforeFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageBefore must be JPEG, PNG, or WebP format',
          });
        }

        if (imageBeforeFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageBefore size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              imageBeforeFile.buffer,
              imageBeforeFile.originalname,
              'case-studies/before',
              true,
              ['case-study', 'before'],
            )
            .then((result) => {
              uploadedFiles.imageBefore = result.url;
            }),
        );
      }

      // Upload imageAfter if provided
      if (files?.imageAfter && files.imageAfter[0]) {
        const imageAfterFile = files.imageAfter[0];

        // Validate image file
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(imageAfterFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageAfter must be JPEG, PNG, or WebP format',
          });
        }

        if (imageAfterFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'imageAfter size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              imageAfterFile.buffer,
              imageAfterFile.originalname,
              'case-studies/after',
              true,
              ['case-study', 'after'],
            )
            .then((result) => {
              uploadedFiles.imageAfter = result.url;
            }),
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Merge uploaded file URLs with other update data
      const updateData = {
        ...updateCaseStudyDto,
        ...uploadedFiles,
      };

      const updatedCaseStudy = await this.caseStudyService.updateCaseStudy(
        id,
        updateData,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Case study updated successfully',
        data: updatedCaseStudy,
      });
    } catch (error) {
      console.error('Update case study error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update case study',
      });
    }
  }
  /**
   * Delete case study (Admin only)
   * DELETE /api/v1/case-studies/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async deleteCaseStudy(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid case study ID format',
        });
      }

      const result = await this.caseStudyService.deleteCaseStudy(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Delete case study error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to delete case study',
      });
    }
  }
  // ==================== PUBLIC ROUTES ====================

  /**
   * Get all case studies (Public access)
   * GET /api/v1/case-studies
   */
  @Get()
  async getAllCaseStudies(
    @Query() query: CaseStudyQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.caseStudyService.getAllCaseStudies(query);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Case studies retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get case studies error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve case studies',
      });
    }
  }

  /**
   * Get case study by ID (Public access)
   * GET /api/v1/case-studies/:id
   */
  @Get(':id')
  async getCaseStudyById(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid case study ID format',
        });
      }

      const caseStudy = await this.caseStudyService.getCaseStudyById(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Case study retrieved successfully',
        data: caseStudy,
      });
    } catch (error) {
      console.error('Get case study by ID error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve case study',
      });
    }
  }
}
