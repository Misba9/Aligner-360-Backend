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
} from '@nestjs/common';
import { Request, Response } from 'express';

import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';
import { AlignerCaseService } from '../services/alignercase.service';
import {
  AlignerCaseQueryDto,
  CreateAlignerCaseDto,
  UpdateAlignerCaseDto,
} from '../dto/alignercase.dto';

@Controller('aligner-cases')
export class AlignerCaseController {
  constructor(private readonly alignerCaseService: AlignerCaseService) {}

  // Helper method to validate MongoDB ObjectID
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // ==================== ADMIN ROUTES ====================

  /**
   * Create a new aligner case (Admin only)
   * POST /api/v1/aligner-cases
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async createAlignerCase(
    @Body(ValidationPipe) createAlignerCaseDto: CreateAlignerCaseDto,
    @Res() res: Response,
  ) {
    try {
      const alignerCase =
        await this.alignerCaseService.createAlignerCase(createAlignerCaseDto);

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Aligner case created successfully',
        data: alignerCase,
      });
    } catch (error) {
      console.error('Create aligner case error:', error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to create aligner case',
      });
    }
  }

  /**
   * Get all aligner cases with filtering and pagination (Admin only)
   * GET /api/v1/aligner-cases/admin
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAllAlignerCasesAdmin(
    @Query() query: AlignerCaseQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.alignerCaseService.getAllAlignerCases(query);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Aligner cases retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get all aligner cases error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve aligner cases',
      });
    }
  }

  /**
   * Get aligner case statistics (Admin only)
   * GET /api/v1/aligner-cases/admin/statistics
   */
  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAlignerCaseStatistics(@Res() res: Response) {
    try {
      const stats = await this.alignerCaseService.getAlignerCaseStatistics();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Aligner case statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get aligner case statistics error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve aligner case statistics',
      });
    }
  }

  /**
   * Update aligner case (Admin only)
   * PUT /api/v1/aligner-cases/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async updateAlignerCase(
    @Param('id') id: string,
    @Body(ValidationPipe) updateAlignerCaseDto: UpdateAlignerCaseDto,
    @Res() res: Response,
  ) {
    try {
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid aligner case ID format',
        });
      }

      const alignerCase = await this.alignerCaseService.updateAlignerCase(
        id,
        updateAlignerCaseDto,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Aligner case updated successfully',
        data: alignerCase,
      });
    } catch (error) {
      console.error('Update aligner case error:', error);
      const statusCode = error.message.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update aligner case',
      });
    }
  }

  /**
   * Delete aligner case (Admin only)
   * DELETE /api/v1/aligner-cases/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async deleteAlignerCase(@Param('id') id: string, @Res() res: Response) {
    try {
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid aligner case ID format',
        });
      }

      const result = await this.alignerCaseService.deleteAlignerCase(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Delete aligner case error:', error);
      const statusCode = error.message.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete aligner case',
      });
    }
  }

  /**
   * Get aligner case by ID (Admin only)
   * GET /api/v1/aligner-cases/admin/:id
   */
  @Get('admin/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAlignerCaseByIdAdmin(@Param('id') id: string, @Res() res: Response) {
    try {
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid aligner case ID format',
        });
      }

      const alignerCase = await this.alignerCaseService.getAlignerCaseById(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Aligner case retrieved successfully',
        data: alignerCase,
      });
    } catch (error) {
      console.error('Get aligner case by ID error:', error);
      const statusCode = error.message.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve aligner case',
      });
    }
  }

  // ==================== USER ROUTES ====================

  /**
   * Get user's aligner cases (User can only see their own cases)
   * GET /api/v1/aligner-cases/my-cases
   */
  @Get('my-cases')
  @UseGuards(AuthGuard)
  async getUserAlignerCases(
    @Query() query: AlignerCaseQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.alignerCaseService.getUserAlignerCases(
        req.user.id,
        req.user.role,
        query,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'User aligner cases retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get user aligner cases error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve user aligner cases',
      });
    }
  }

  /**
   * Get user's specific aligner case by ID (User can only see their own case)
   * GET /api/v1/aligner-cases/:id
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async getUserAlignerCaseById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid aligner case ID format',
        });
      }

      const alignerCase = await this.alignerCaseService.getUserAlignerCaseById(
        id,
        req.user.id,
        req.user.role,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Aligner case retrieved successfully',
        data: alignerCase,
      });
    } catch (error) {
      console.error('Get user aligner case by ID error:', error);

      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      if (error.message.includes('not found')) {
        statusCode = HttpStatus.NOT_FOUND;
      } else if (
        error.message.includes('Forbidden') ||
        error.message.includes('access your own')
      ) {
        statusCode = HttpStatus.FORBIDDEN;
      } else if (error.message.includes('Invalid')) {
        statusCode = HttpStatus.BAD_REQUEST;
      }

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve aligner case',
      });
    }
  }
}
