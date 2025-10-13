import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { UserRole } from '../../guards/auth.guard';
import { AlignerCase, Prisma } from '@prisma/client';
import { AlignerCaseQueryDto, CreateAlignerCaseDto, UpdateAlignerCaseDto } from '../dto/alignercase.dto';

@Injectable()
export class AlignerCaseService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper method to validate MongoDB ObjectID
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Create aligner case (Admin only)
  async createAlignerCase(
    createAlignerCaseDto: CreateAlignerCaseDto,
  ): Promise<AlignerCase> {
    try {
      // Validate if user exists
      const userExists = await this.prisma.user.findUnique({
        where: { id: createAlignerCaseDto.userId },
      });

      if (!userExists) {
        throw new NotFoundException('User not found');
      }

      const alignerCase = await this.prisma.alignerCase.create({
        data: {
          name: createAlignerCaseDto.name,
          quantity: createAlignerCaseDto.quantity,
          userId: createAlignerCaseDto.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return alignerCase;
    } catch (error) {
      console.error('Create aligner case error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create aligner case');
    }
  }

  // Get all aligner cases with filtering and pagination (Admin only)
  async getAllAlignerCases(query: AlignerCaseQueryDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        userId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.AlignerCaseWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { quantity: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (userId) {
        where.userId = userId;
      }

      // Build orderBy clause
      const orderBy: Prisma.AlignerCaseOrderByWithRelationInput = {};
      if (sortBy === 'userName') {
        orderBy.user = { firstName: sortOrder };
      } else {
        orderBy[sortBy] = sortOrder;
      }

      const [alignerCases, total] = await Promise.all([
        this.prisma.alignerCase.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.alignerCase.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: alignerCases,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Get all aligner cases error:', error);
      throw new BadRequestException('Failed to retrieve aligner cases');
    }
  }

  // Get aligner case by ID (Admin only)
  async getAlignerCaseById(id: string): Promise<AlignerCase> {
    try {
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid aligner case ID format');
      }

      const alignerCase = await this.prisma.alignerCase.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!alignerCase) {
        throw new NotFoundException('Aligner case not found');
      }

      return alignerCase;
    } catch (error) {
      console.error('Get aligner case by ID error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve aligner case');
    }
  }

  // Update aligner case (Admin only)
  async updateAlignerCase(
    id: string,
    updateAlignerCaseDto: UpdateAlignerCaseDto,
  ): Promise<AlignerCase> {
    try {
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid aligner case ID format');
      }

      // Check if aligner case exists
      const existingCase = await this.prisma.alignerCase.findUnique({
        where: { id },
      });

      if (!existingCase) {
        throw new NotFoundException('Aligner case not found');
      }

      // If userId is being updated, validate if user exists
      if (updateAlignerCaseDto.userId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: updateAlignerCaseDto.userId },
        });

        if (!userExists) {
          throw new NotFoundException('User not found');
        }
      }

      const updatedAlignerCase = await this.prisma.alignerCase.update({
        where: { id },
        data: updateAlignerCaseDto,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updatedAlignerCase;
    } catch (error) {
      console.error('Update aligner case error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update aligner case');
    }
  }

  // Delete aligner case (Admin only)
  async deleteAlignerCase(id: string): Promise<{ message: string }> {
    try {
      if (!this.isValidObjectId(id)) {
        throw new BadRequestException('Invalid aligner case ID format');
      }

      const existingCase = await this.prisma.alignerCase.findUnique({
        where: { id },
      });

      if (!existingCase) {
        throw new NotFoundException('Aligner case not found');
      }

      await this.prisma.alignerCase.delete({
        where: { id },
      });

      return { message: 'Aligner case deleted successfully' };
    } catch (error) {
      console.error('Delete aligner case error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete aligner case');
    }
  }

  // Get user's aligner cases (User can only see their own cases)
  async getUserAlignerCases(
    userId: string,
    userRole: UserRole,
    query: AlignerCaseQueryDto,
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.AlignerCaseWhereInput = {
        userId: userId, // Users can only see their own cases
      };

      if (search) {
        where.AND = [
          { userId: userId },
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { quantity: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      // Build orderBy clause
      const orderBy: Prisma.AlignerCaseOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      const [alignerCases, total] = await Promise.all([
        this.prisma.alignerCase.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.alignerCase.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: alignerCases,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Get user aligner cases error:', error);
      throw new BadRequestException('Failed to retrieve user aligner cases');
    }
  }

  // Get user's specific aligner case by ID (User can only see their own case)
  async getUserAlignerCaseById(
    caseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AlignerCase> {
    try {
      if (!this.isValidObjectId(caseId)) {
        throw new BadRequestException('Invalid aligner case ID format');
      }

      const alignerCase = await this.prisma.alignerCase.findUnique({
        where: { id: caseId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!alignerCase) {
        throw new NotFoundException('Aligner case not found');
      }

      // Check if the case belongs to the user (unless they are admin)
      if (userRole !== UserRole.ADMIN && alignerCase.userId !== userId) {
        throw new ForbiddenException(
          'You can only access your own aligner cases',
        );
      }

      return alignerCase;
    } catch (error) {
      console.error('Get user aligner case by ID error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve aligner case');
    }
  }

  // Get aligner case statistics (Admin only)
  async getAlignerCaseStatistics() {
    try {
      const [totalCases, totalUsers, recentCases, casesByUser] =
        await Promise.all([
          this.prisma.alignerCase.count(),
          this.prisma.alignerCase.groupBy({
            by: ['userId'],
            _count: { userId: true },
          }),
          this.prisma.alignerCase.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          }),
          this.prisma.alignerCase.groupBy({
            by: ['userId'],
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 10,
          }),
        ]);

      const usersWithCases = totalUsers.length;
      const averageCasesPerUser = totalCases / (usersWithCases || 1);

      return {
        totalCases,
        usersWithCases,
        averageCasesPerUser: Math.round(averageCasesPerUser * 100) / 100,
        recentCases,
        casesByUser: casesByUser.map((item) => ({
          userId: item.userId,
          caseCount: item._count.userId,
        })),
      };
    } catch (error) {
      console.error('Get aligner case statistics error:', error);
      throw new BadRequestException(
        'Failed to retrieve aligner case statistics',
      );
    }
  }
}
