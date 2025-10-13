import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  LiveSessionQueryDto,
  SessionStatus,
} from '../dto/livesession.dto';
import { UserRole } from '../../guards/auth.guard';
import * as moment from 'moment-timezone';

@Injectable()
export class LiveSessionService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper function to generate slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  // Helper function to ensure unique slug
  private async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const where: any = { slug: uniqueSlug };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingSession = await this.prisma.liveSession.findFirst({
        where,
        select: { id: true },
      });

      if (!existingSession) {
        return uniqueSlug;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  // Create a new live session (Admin only)
  async createLiveSession(
    createSessionDto: CreateLiveSessionDto,
    createdById: string,
  ) {
    const { title, slug, scheduledAt, timezone, ...rest } = createSessionDto;

    // Generate slug if not provided
    let sessionSlug = slug || this.generateSlug(title);
    sessionSlug = await this.ensureUniqueSlug(sessionSlug);

    // Validate scheduledAt is in the future
    const scheduleDate = moment.tz(scheduledAt, timezone).utc().toDate();

    const now = new Date();
    if (scheduleDate <= now) {
      throw new BadRequestException('Scheduled time must be in the future');
    }
    const session = await this.prisma.liveSession.create({
      data: {
        title,
        slug: sessionSlug,
        scheduledAt: scheduleDate,
        ...rest,
        createdBy: {
          connect: {
            id: createdById,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return session;
  }

  // Get all live sessions with filtering and pagination
  async getAllLiveSessions(query: LiveSessionQueryDto) {
    const {
      search,
      status,
      createdById,
      page = '1',
      limit = '10',
      sortBy = 'scheduledAt',
      sortOrder = 'asc',
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const now = new Date();
    // Build where condition
    const where: any = {
      isActive: true, // Only show active sessions
      OR: [
        // Upcoming scheduled sessions
        {
          status: SessionStatus.SCHEDULED,
          scheduledAt: {
            gte: now,
          },
        },
        // Currently live sessions
        {
          status: SessionStatus.LIVE,
        },
      ],
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (createdById) {
      where.createdById = createdById;
    }

    // Get total count for pagination
    const total = await this.prisma.liveSession.count({ where });

    // Get sessions
    const sessions = await this.prisma.liveSession.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum,
    });

    return {
      data: sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  // Get upcoming live sessions for public viewing
  async getUpcomingLiveSessions(query: LiveSessionQueryDto) {
    const data = await this.getAllLiveSessions({
      ...query,
    });
    return data;
  }

  // Get live session by ID
  async getLiveSessionById(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    return session;
  }

  // Get live session by slug
  async getLiveSessionBySlug(slug: string, userRole?: UserRole) {
    const session = await this.prisma.liveSession.findUnique({
      where: { slug },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    // Only allow non-admins to view active sessions
    if (userRole !== UserRole.ADMIN && !session.isActive) {
      throw new NotFoundException('Live session not found');
    }

    return session;
  }

  // Update live session (Admin only)
  async updateLiveSession(
    id: string,
    updateSessionDto: UpdateLiveSessionDto,
    userRole: UserRole,
    userId: string,
  ) {
    const existingSession = await this.prisma.liveSession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      throw new NotFoundException('Live session not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && existingSession.createdById !== userId) {
      throw new ForbiddenException(
        'You can only update your own sessions or you must be an admin',
      );
    }

    const { title, slug, scheduledAt, ...rest } = updateSessionDto;
    const updateData: any = { ...rest };

    // Update title if provided
    if (title) {
      updateData.title = title;
    }

    // Handle slug update
    if (slug || title) {
      let sessionSlug =
        slug || (title ? this.generateSlug(title) : existingSession.slug);
      sessionSlug = await this.ensureUniqueSlug(sessionSlug, id);
      updateData.slug = sessionSlug;
    }

    // Handle scheduledAt update
    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      if (scheduleDate <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
      updateData.scheduledAt = scheduleDate;
    }

    const updatedSession = await this.prisma.liveSession.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedSession;
  }

  // Start live session
  async startLiveSession(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Session is not scheduled');
    }

    const updatedSession = await this.prisma.liveSession.update({
      where: { id },
      data: {
        status: SessionStatus.LIVE,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updatedSession;
  }

  // End live session
  async endLiveSession(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    if (session.status !== SessionStatus.LIVE) {
      throw new BadRequestException('Session is not live');
    }

    const updatedSession = await this.prisma.liveSession.update({
      where: { id },
      data: {
        status: SessionStatus.COMPLETED,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updatedSession;
  }

  // Cancel live session
  async cancelLiveSession(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed session');
    }

    const updatedSession = await this.prisma.liveSession.update({
      where: { id },
      data: {
        status: SessionStatus.CANCELLED,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updatedSession;
  }

  // Delete live session (Admin only)
  async deleteLiveSession(id: string, userRole: UserRole, userId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && session.createdById !== userId) {
      throw new ForbiddenException(
        'You can only delete your own sessions or you must be an admin',
      );
    }

    await this.prisma.liveSession.delete({
      where: { id },
    });

    return { message: 'Live session deleted successfully' };
  }

  // Get live session statistics (Admin only)
  async getLiveSessionStatistics() {
    const [
      totalSessions,
      scheduledSessions,
      liveSessions,
      completedSessions,
      cancelledSessions,
      totalRegistrations,
      totalAttendance,
    ] = await Promise.all([
      this.prisma.liveSession.count(),
      this.prisma.liveSession.count({
        where: { status: SessionStatus.SCHEDULED },
      }),
      this.prisma.liveSession.count({ where: { status: SessionStatus.LIVE } }),
      this.prisma.liveSession.count({
        where: { status: SessionStatus.COMPLETED },
      }),
      this.prisma.liveSession.count({
        where: { status: SessionStatus.CANCELLED },
      }),
      this.prisma.liveSession.aggregate({
        _sum: { registrationCount: true },
      }),
      this.prisma.liveSession.aggregate({
        _sum: { attendanceCount: true },
      }),
    ]);

    // Get popular categories

    return {
      totalSessions,
      scheduledSessions,
      liveSessions,
      completedSessions,
      cancelledSessions,
      totalRegistrations: totalRegistrations._sum.registrationCount || 0,
      totalAttendance: totalAttendance._sum.attendanceCount || 0,
    };
  }

  // Search live sessions with advanced filtering
  async searchLiveSessions(
    query: string,
    filters?: Partial<LiveSessionQueryDto>,
  ) {
    const where: any = {
      isActive: true, // Only search active sessions for public
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { topic: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    };

    if (filters?.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.createdById) {
      where.createdById = filters.createdById;
    }

    const sessions = await this.prisma.liveSession.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20, // Limit search results
    });

    return sessions;
  }
}
