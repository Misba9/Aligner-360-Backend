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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LiveSessionService } from '../services/livesession.service';
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  LiveSessionQueryDto,
} from '../dto/livesession.dto';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';

@Controller('live-sessions')
@UseGuards(AuthGuard)
export class LiveSessionController {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  // ==================== ADMIN ROUTES ====================
  /**
   * Create a new live session (Admin only)
   * POST /api/v1/live-sessions
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async createLiveSession(
    @Body(ValidationPipe) createSessionDto: CreateLiveSessionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const session = await this.liveSessionService.createLiveSession(
      createSessionDto,
      req.user.id,
    );
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Live session created successfully',
      data: session,
    });
  }
  /**
   * Get all live sessions with admin privileges (filtering, pagination, all statuses)
   * GET /api/v1/live-sessions/admin
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getAllLiveSessionsAdmin(
    @Query() query: LiveSessionQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.liveSessionService.getAllLiveSessions(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live sessions retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }
  /**
   * Get live session statistics (Admin only)
   * GET /api/v1/live-sessions/admin/statistics
   */
  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getLiveSessionStatistics(@Res() res: Response) {
    const stats = await this.liveSessionService.getLiveSessionStatistics();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session statistics retrieved successfully',
      data: stats,
    });
  } /**
   * Update a live session (Admin only)
   * PUT /api/v1/live-sessions/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async updateLiveSession(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSessionDto: UpdateLiveSessionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid session ID format',
      });
    }
    const session = await this.liveSessionService.updateLiveSession(
      id,
      updateSessionDto,
      req.user.role,
      req.user.id,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session updated successfully',
      data: session,
    });
  }
  /**
   * Start a live session (Admin only)
   * PATCH /api/v1/live-sessions/:id/start
   */
  @Patch(':id/start')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async startLiveSession(@Param('id') id: string, @Res() res: Response) {
    const session = await this.liveSessionService.startLiveSession(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session started successfully',
      data: session,
    });
  }
  /**
   * End a live session (Admin only)
   * PATCH /api/v1/live-sessions/:id/end
   */
  @Patch(':id/end')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async endLiveSession(@Param('id') id: string, @Res() res: Response) {
    const session = await this.liveSessionService.endLiveSession(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session ended successfully',
      data: session,
    });
  }
  /**
   * Cancel a live session (Admin only)
   * PATCH /api/v1/live-sessions/:id/cancel
   */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async cancelLiveSession(@Param('id') id: string, @Res() res: Response) {
    const session = await this.liveSessionService.cancelLiveSession(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session cancelled successfully',
      data: session,
    });
  }
  /**
   * Delete a live session (Admin only)
   * DELETE /api/v1/live-sessions/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async deleteLiveSession(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.liveSessionService.deleteLiveSession(
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
   * Get all upcoming live sessions (Public access)
   * GET /api/v1/live-sessions
   */
  @Get()
  async getUpcomingLiveSessions(
    @Query() query: LiveSessionQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.liveSessionService.getUpcomingLiveSessions(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Upcoming live sessions retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Search live sessions (Public access)
   * GET /api/v1/live-sessions/search?q=searchterm
   */
  @Get('search')
  async searchLiveSessions(
    @Query('q') query: string,
    @Query() filters: LiveSessionQueryDto,
    @Res() res: Response,
  ) {
    if (!query) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const sessions = await this.liveSessionService.searchLiveSessions(
      query,
      filters,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: sessions,
      query,
    });
  }

  @Get('slug/:slug')
  async getLiveSessionBySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Check if user is authenticated and get their role
    let userRole: UserRole | undefined;
    try {
      const token = req.cookies?.access_token;

      if (token && req.user) {
        userRole = req.user.role;
      }
    } catch (error) {
      // User is not authenticated, continue as public user
    }

    const session = await this.liveSessionService.getLiveSessionBySlug(
      slug,
      userRole,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session retrieved successfully',
      data: session,
    });
  }

  /**
   * Get live session by ID (Public access for active sessions, Admin for all)
   * GET /api/v1/live-sessions/:id
   */
  @Get(':id')
  async getLiveSessionById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid session ID format',
      });
    }

    const session = await this.liveSessionService.getLiveSessionById(id);

    // Check if user can access this session
    let userRole: UserRole | undefined;
    try {
      const token = req.cookies?.access_token;
      if (token && req.user) {
        userRole = req.user.role;
      }
    } catch (error) {
      // User is not authenticated
    }

    // If session is not active and user is not admin, throw error
    if (!session.isActive && userRole !== UserRole.ADMIN) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Live session not found',
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Live session retrieved successfully',
      data: session,
    });
  }
}
