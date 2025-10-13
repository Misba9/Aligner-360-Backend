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
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MapUsersService } from '../services/mapusers.service';
import {
  CreateMapUserDto,
  UpdateMapUserDto,
  MapUserQueryDto,
} from '../dto/mapusers.dto';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';

@Controller('map-users')
export class MapUsersController {
  constructor(private readonly mapUsersService: MapUsersService) {}

  // Helper method to validate MongoDB ObjectID
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // ==================== ADMIN ROUTES ====================
  /**
   * Create a new map user (Admin only)
   * POST /api/v1/map-users
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async createMapUser(
    @Body(ValidationPipe) createMapUserDto: CreateMapUserDto,
    @Res() res: Response,
  ) {
    try {
      const mapUser =
        await this.mapUsersService.createMapUser(createMapUserDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Map user created successfully',
        data: mapUser,
      });
    } catch (error) {
      console.error('Create map user error:', error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to create map user',
      });
    }
  }

  /**
   * Get all map users with admin privileges (filtering, pagination)
   * GET /api/v1/map-users/admin
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAllMapUsersAdmin(
    @Query() query: MapUserQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.mapUsersService.getAllMapUsers(query);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Map users retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get map users admin error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve map users',
      });
    }
  }

  /**
   * Get map user statistics (Admin only)
   * GET /api/v1/map-users/admin/statistics
   */
  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getMapUsersStatistics(@Res() res: Response) {
    try {
      const stats = await this.mapUsersService.getMapUsersStatistics();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Map users statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get map users statistics error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve statistics',
      });
    }
  }

  /**
   * Get map user by ID (Admin only)
   * GET /api/v1/map-users/:id/admin
   */
  @Get(':id/admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getMapUserByIdAdmin(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid map user ID format',
        });
      }

      const mapUser = await this.mapUsersService.getMapUserById(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Map user retrieved successfully',
        data: mapUser,
      });
    } catch (error) {
      console.error('Get map user by ID admin error:', error);
      if (error.message === 'Map user not found') {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve map user',
      });
    }
  }

  /**
   * Update a map user (Admin only)
   * PUT /api/v1/map-users/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async updateMapUser(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMapUserDto: UpdateMapUserDto,
    @Res() res: Response,
  ) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid map user ID format',
        });
      }

      const updatedUser = await this.mapUsersService.updateMapUser(
        id,
        updateMapUserDto,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Map user updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Update map user error:', error);
      if (error.message === 'Map user not found') {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to update map user',
      });
    }
  }

  /**
   * Toggle map user visibility (Admin only)
   * PATCH /api/v1/map-users/:id/toggle-visibility
   */
  @Patch(':id/toggle-visibility')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async toggleMapUserVisibility(
    @Param('id') id: string,
    @Body('showOnMap') showOnMap: boolean,
    @Res() res: Response,
  ) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid map user ID format',
        });
      }

      if (typeof showOnMap !== 'boolean') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'showOnMap must be a boolean value',
        });
      }

      const updatedUser = await this.mapUsersService.toggleShowOnMap(
        id,
        showOnMap,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Map user ${showOnMap ? 'shown on' : 'hidden from'} map successfully`,
        data: updatedUser,
      });
    } catch (error) {
      console.error('Toggle map user visibility error:', error);
      if (error.message === 'Map user not found') {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to toggle map user visibility',
      });
    }
  }

  /**
   * Delete a map user (Admin only)
   * DELETE /api/v1/map-users/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async deleteMapUser(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid map user ID format',
        });
      }

      const result = await this.mapUsersService.deleteMapUser(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Delete map user error:', error);
      if (error.message === 'Map user not found') {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to delete map user',
      });
    }
  }

  // ==================== PUBLIC ROUTES ====================
  /**
   * Get all visible map users (Public access)
   * GET /api/v1/map-users
   */
  @Get()
  async getVisibleMapUsers(@Res() res: Response) {
    try {
      const result = await this.mapUsersService.getVisibleMapUsers();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Visible map users retrieved successfully',
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error('Get visible map users error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve map users',
      });
    }
  }

  /**
   * Get map user by ID (Public access for visible users)
   * GET /api/v1/map-users/:id
   */
  @Get(':id')
  async getMapUserById(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid map user ID format',
        });
      }

      const mapUser = await this.mapUsersService.getMapUserById(id);

      // Only return if user is visible on map for public access
      if (!mapUser.showOnMap) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Map user not found',
        });
      }

      // Remove sensitive information for public access
      const {
        id: userId,
        firstName,
        lastName,
        location,
        clinicName,
        zipCode,
      } = mapUser;

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Map user retrieved successfully',
        data: {
          id: userId,
          firstName,
          lastName,
          location,
          clinicName,
          zipCode,
        },
      });
    } catch (error) {
      console.error('Get map user by ID error:', error);
      if (error.message === 'Map user not found') {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to retrieve map user',
      });
    }
  }
}
