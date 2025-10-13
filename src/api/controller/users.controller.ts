import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ValidationPipe,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from '../services/users.service';
import {
  UsersQueryDto,
  UpdateUserStatusDto,
  ToggleShowOnMapDto,
} from '../dto/users.dto';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users with filtering and pagination (Admin only)
   * GET /api/v1/users
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getAllUsers(
    @Query(ValidationPipe) query: UsersQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.usersService.getAllUsers(query);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Users retrieved successfully',
      users: result.users,
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
      totalPages: result.pagination.totalPages,
    });
  }

  /**
   * Get user statistics (Admin only)
   * GET /api/v1/users/statistics
   */
  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getUserStatistics(@Res() res: Response) {
    const stats = await this.usersService.getUserStatistics();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats,
    });
  }

  @Get('logged-in-user')
  async getLoggedInUser(@Res() res: Response, @Req() req: Request) {
    const userId = req.user.id;
    const user = await this.usersService.getLoggedInUser(userId);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Logged in user retrieved successfully',
      data: user,
    });
  }
  /**
   * GET /api/v1/users/:id
   */
  @Get(':id')
  async getUserById(@Param('id') id: string, @Res() res: Response) {
    const user = await this.usersService.getUserById(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  }

  /**
   * Update user status (Admin only)
   * PATCH /api/v1/users/:id/status
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async updateUserStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserStatusDto: UpdateUserStatusDto,
    @Res() res: Response,
  ) {
    const user = await this.usersService.updateUserStatus(
      id,
      updateUserStatusDto.isActive,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User status updated successfully',
      data: user,
    });
  }

  /**
   * Toggle user showOnMap property (Admin only)
   * PATCH /api/v1/users/:id/show-on-map
   */
  @Patch(':id/show-on-map')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async toggleShowOnMap(
    @Param('id') id: string,
    @Body(ValidationPipe) toggleShowOnMapDto: ToggleShowOnMapDto,
    @Res() res: Response,
  ) {
    const user = await this.usersService.toggleShowOnMap(
      id,
      toggleShowOnMapDto.showOnMap,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User show on map status updated successfully',
      data: user,
    });
  }

  /**
   * Delete user (Admin only)
   * DELETE /api/v1/users/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async deleteUser(@Param('id') id: string, @Res() res: Response) {
    const result = await this.usersService.deleteUser(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  }
}
