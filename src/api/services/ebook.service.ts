import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEbookDto,
  UpdateEbookDto,
  EbookQueryDto,
  EbookStatus,
  PublishEbookDto,
} from '../dto/ebook.dto';
import { UserRole } from '../../guards/auth.guard';

@Injectable()
export class EbookService {
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

      const existingEbook = await this.prisma.ebook.findUnique({ where });

      if (!existingEbook) {
        return uniqueSlug;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  } // Create a new ebook (Admin only)
  async createEbook(createEbookDto: CreateEbookDto, uploadedById: string) {
    const { title, slug, publishedDate, ...rest } = createEbookDto;

    // Generate slug if not provided
    let ebookSlug = slug || this.generateSlug(title);
    ebookSlug = await this.ensureUniqueSlug(ebookSlug);

    const data: any = {
      title,
      slug: ebookSlug,
      ...rest,
      uploadedBy: {
        connect: {
          id: uploadedById,
        },
      },
    };

    // Handle data type conversions
    if (data.price !== undefined) {
      data.price =
        typeof data.price === 'string' ? parseFloat(data.price) : data.price;
    }

    if (data.isFreeEbook !== undefined) {
      data.isFreeEbook =
        typeof data.isFreeEbook === 'string'
          ? data.isFreeEbook === 'true'
          : data.isFreeEbook;
    }

    if (data.isActive !== undefined) {
      data.isActive =
        typeof data.isActive === 'string'
          ? data.isActive === 'true'
          : data.isActive;
    }

    if (data.isFree !== undefined) {
      data.isFree =
        typeof data.isFree === 'string' ? data.isFree === 'true' : data.isFree;
    }

    // Handle publishedDate
    if (publishedDate) {
      data.publishedDate = new Date(publishedDate);
    }

    const ebook = await this.prisma.ebook.create({
      data,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    return ebook;
  }

  // Get all ebooks with filtering and pagination
  async getAllEbooks(query: EbookQueryDto) {
    const {
      search,
      status,
      uploadedById,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where condition
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (uploadedById) {
      where.uploadedById = uploadedById;
    }
    // Get total count for pagination
    const total = await this.prisma.ebook.count({ where });

    // Get ebooks
    const ebooks = await this.prisma.ebook.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum,
    });

    return {
      data: ebooks,
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

  // Get published ebooks for public viewing
  async getPublishedEbooks(query: EbookQueryDto) {
    return this.getAllEbooks({
      ...query,
      status: EbookStatus.PUBLISHED,
    });
  }

  // Get ebook by ID
  async getEbookById(id: string) {
    const ebook = await this.prisma.ebook.findUnique({
      where: { id },
      include: {
        uploadedBy: {
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

    if (!ebook) {
      throw new NotFoundException('Ebook not found');
    }

    // Increment view count if published
    if (ebook.status === EbookStatus.PUBLISHED) {
      await this.prisma.ebook.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return ebook;
  }

  // Update ebook (Admin only)
  async updateEbook(
    id: string,
    updateEbookDto: UpdateEbookDto,
    userRole: UserRole,
    userId: string,
  ) {
    const existingEbook = await this.prisma.ebook.findUnique({
      where: { id },
    });
    if (updateEbookDto.isFreeEbook !== undefined) {
      updateEbookDto.isFreeEbook =
        typeof updateEbookDto.isFreeEbook === 'string' &&
        updateEbookDto.isFreeEbook === 'true'
          ? true
          : false;
    }
    if (updateEbookDto.price !== undefined) {
      updateEbookDto.price =
        typeof updateEbookDto.price === 'string'
          ? parseFloat(updateEbookDto.price)
          : updateEbookDto.price;
    }

    if (!existingEbook) {
      throw new NotFoundException('Ebook not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && existingEbook.uploadedById !== userId) {
      throw new ForbiddenException(
        'You can only update your own ebooks or you must be an admin',
      );
    }
    const { title, slug, publishedDate, ...rest } = updateEbookDto;
    const updateData: any = { ...rest };

    // Update title if provided
    if (title) {
      updateData.title = title;
    }

    // Handle data type conversions
    if (updateData.price !== undefined) {
      updateData.price =
        typeof updateData.price === 'string'
          ? parseFloat(updateData.price)
          : updateData.price;
    }

    if (updateData.isFreeEbook !== undefined) {
      updateData.isFreeEbook =
        typeof updateData.isFreeEbook === 'string'
          ? updateData.isFreeEbook === 'true'
          : updateData.isFreeEbook;
    }

    if (updateData.isActive !== undefined) {
      updateData.isActive =
        typeof updateData.isActive === 'string'
          ? updateData.isActive === 'true'
          : updateData.isActive;
    }

    if (updateData.isFree !== undefined) {
      updateData.isFree =
        typeof updateData.isFree === 'string'
          ? updateData.isFree === 'true'
          : updateData.isFree;
    }

    // Handle publishedDate
    if (publishedDate) {
      updateData.publishedDate = new Date(publishedDate);
    }

    const updatedEbook = await this.prisma.ebook.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedEbook;
  }

  // Publish ebook
  async publishEbook(id: string, publishEbookDto: PublishEbookDto) {
    const ebook = await this.prisma.ebook.findUnique({
      where: { id },
    });

    if (!ebook) {
      throw new NotFoundException('Ebook not found');
    }

    if (ebook.status === EbookStatus.PUBLISHED) {
      throw new BadRequestException('Ebook is already published');
    }

    const data: any = {
      status: EbookStatus.PUBLISHED,
    };

    if (publishEbookDto.publishedDate) {
      data.publishedDate = new Date(publishEbookDto.publishedDate);
    }

    const updatedEbook = await this.prisma.ebook.update({
      where: { id },
      data,
      include: {
        uploadedBy: {
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

    return updatedEbook;
  }

  // Unpublish ebook
  async unpublishEbook(id: string) {
    const ebook = await this.prisma.ebook.findUnique({
      where: { id },
    });

    if (!ebook) {
      throw new NotFoundException('Ebook not found');
    }

    if (ebook.status !== EbookStatus.PUBLISHED) {
      throw new BadRequestException('Ebook is not published');
    }

    const updatedEbook = await this.prisma.ebook.update({
      where: { id },
      data: {
        status: EbookStatus.DRAFT,
      },
      include: {
        uploadedBy: {
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

    return updatedEbook;
  }

  // Delete ebook (Admin only)
  async deleteEbook(id: string, userRole: UserRole, userId: string) {
    const ebook = await this.prisma.ebook.findUnique({
      where: { id },
    });

    if (!ebook) {
      throw new NotFoundException('Ebook not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && ebook.uploadedById !== userId) {
      throw new ForbiddenException(
        'You can only delete your own ebooks or you must be an admin',
      );
    }

    await this.prisma.ebook.delete({
      where: { id },
    });

    return { message: 'Ebook deleted successfully' };
  }

  // Get ebook statistics (Admin only)
  async getEbookStatistics() {
    const [
      totalEbooks,
      publishedEbooks,
      draftEbooks,
      archivedEbooks,
      totalViews,
      totalDownloads,
    ] = await Promise.all([
      this.prisma.ebook.count(),
      this.prisma.ebook.count({ where: { status: EbookStatus.PUBLISHED } }),
      this.prisma.ebook.count({ where: { status: EbookStatus.DRAFT } }),
      this.prisma.ebook.count({ where: { status: EbookStatus.ARCHIVED } }),
      this.prisma.ebook.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.ebook.aggregate({
        _sum: { downloadCount: true },
      }),
    ]);

    return {
      totalEbooks,
      publishedEbooks,
      draftEbooks,
      archivedEbooks,
      totalViews: totalViews._sum.viewCount || 0,
      totalDownloads: totalDownloads._sum.downloadCount || 0,
    };
  }

  // Search ebooks with advanced filtering
  async searchEbooks(query: string, filters?: Partial<EbookQueryDto>) {
    const where: any = {
      status: EbookStatus.PUBLISHED, // Only search published ebooks for public
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    };

    if (filters?.uploadedById) {
      where.uploadedById = filters.uploadedById;
    }

    const ebooks = await this.prisma.ebook.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit search results
    });

    return ebooks;
  }

  // Download ebook (track download)
  async downloadEbook(id: string, userId?: string) {
    const ebook = await this.prisma.ebook.findUnique({
      where: { id },
    });

    if (!ebook) {
      throw new NotFoundException('Ebook not found');
    }

    if (ebook.status !== EbookStatus.PUBLISHED) {
      throw new BadRequestException('Ebook is not available for download');
    }

    if (!ebook.isDownloadable) {
      throw new BadRequestException('This ebook is not downloadable');
    }

    // Increment download count
    await this.prisma.ebook.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      fileUrl: ebook.pdf,
      fileId: ebook.id,
    };
  }
}
