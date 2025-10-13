import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBlogDto,
  UpdateBlogDto,
  BlogQueryDto,
  BlogStatus,
  PublishBlogDto,
} from '../dto/blog.dto';
import { UserRole } from '../../guards/auth.guard';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}
  // Helper function to generate slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Helper function to ensure unique slug
  private async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existingBlog = await this.prisma.blog.findUnique({
        where: { slug: uniqueSlug },
      });

      if (!existingBlog || existingBlog.id === excludeId) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  // Create a new blog (Admin only)
  async createBlog(createBlogDto: CreateBlogDto, authorId: string) {
    const { title, slug, ...rest } = createBlogDto;

    // Generate slug if not provided
    let blogSlug = slug || this.generateSlug(title);
    blogSlug = await this.ensureUniqueSlug(blogSlug);

    const blog = await this.prisma.blog.create({
      data: {
        title,
        slug: blogSlug,
        authorId,
        ...rest,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return blog;
  }

  // Get all blogs with filtering and pagination
  async getAllBlogs(query: BlogQueryDto) {
    const {
      search,
      status,
      category,
      authorId,
      page = '1',
      limit = '10',
      isForDentist,
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
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (isForDentist !== undefined) {
      where.isForDentist = isForDentist;
    }
    // Get total count for pagination
    const total = await this.prisma.blog.count({ where });

    // Get blogs
    const blogs = await this.prisma.blog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum,
    });

    return {
      data: blogs,
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

  // Get published blogs for public viewing
  async getPublishedBlogs(query: BlogQueryDto) {
    return this.getAllBlogs({
      ...query,
      status: BlogStatus.PUBLISHED,
    });
  }

  // Get blog by ID
  async getBlogById(id: string, role: UserRole) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (
      blog.status === BlogStatus.PUBLISHED &&
      role &&
      role !== UserRole.ADMIN
    ) {
      await this.prisma.blog.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return blog;
  }

  // Get blog by slug
  async getBlogBySlug(slug: string, userRole?: UserRole) {
    const blog = await this.prisma.blog.findUnique({
      where: { slug },
    });
    if (!userRole && blog.isForDentist) {
      throw new ForbiddenException('You can only view public blogs');
    }
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Only allow non-admins to view published blogs
    if (userRole !== UserRole.ADMIN && blog.status !== BlogStatus.PUBLISHED) {
      throw new NotFoundException('Blog not found');
    }

    // Increment view count if published
    if (blog.status === BlogStatus.PUBLISHED) {
      await this.prisma.blog.update({
        where: { id: blog.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return blog;
  }

  // Update blog (Admin only)
  async updateBlog(
    id: string,
    updateBlogDto: UpdateBlogDto,
    userRole: UserRole,
    userId: string,
  ) {
    const existingBlog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!existingBlog) {
      throw new NotFoundException('Blog not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && existingBlog.authorId !== userId) {
      throw new ForbiddenException(
        'You can only update your own blogs or you must be an admin',
      );
    }

    const { title, slug, ...rest } = updateBlogDto;
    const updateData: any = { ...rest };

    // Update title if provided
    if (title) {
      updateData.title = title;
    }

    // Handle slug update
    if (slug || title) {
      let blogSlug =
        slug || (title ? this.generateSlug(title) : existingBlog.slug);
      blogSlug = await this.ensureUniqueSlug(blogSlug, id);
      updateData.slug = blogSlug;
    }

    const updatedBlog = await this.prisma.blog.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedBlog;
  }

  // Publish blog
  async publishBlog(id: string, publishBlogDto: PublishBlogDto) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (blog.status === BlogStatus.PUBLISHED) {
      throw new BadRequestException('Blog is already published');
    }

    const publishedAt = publishBlogDto.publishedAt
      ? new Date(publishBlogDto.publishedAt)
      : new Date();

    const updatedBlog = await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.PUBLISHED,
        publishedAt,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedBlog;
  }

  // Unpublish blog
  async unpublishBlog(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (blog.status !== BlogStatus.PUBLISHED) {
      throw new BadRequestException('Blog is not published');
    }

    const updatedBlog = await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.DRAFT,
        publishedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedBlog;
  }

  // Delete blog (Admin only)
  async deleteBlog(id: string, userRole: UserRole, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && blog.authorId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own blogs or you must be an admin',
      );
    }

    await this.prisma.blog.delete({
      where: { id },
    });

    return { message: 'Blog deleted successfully' };
  }

  // Get blog statistics (Admin only)
  async getBlogStatistics() {
    const [
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      archivedBlogs,
      totalViews,
      totalLikes,
    ] = await Promise.all([
      this.prisma.blog.count(),
      this.prisma.blog.count({ where: { status: BlogStatus.PUBLISHED } }),
      this.prisma.blog.count({ where: { status: BlogStatus.DRAFT } }),
      this.prisma.blog.count({ where: { status: BlogStatus.ARCHIVED } }),
      this.prisma.blog.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.blog.aggregate({
        _sum: { likeCount: true },
      }),
    ]);

    // Get popular categories
    const popularCategories = await this.prisma.blog.groupBy({
      by: ['category'],
      _count: { category: true },
      where: {
        category: { not: null },
      },
      orderBy: {
        _count: { category: 'desc' },
      },
      take: 10,
    });

    return {
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      archivedBlogs,
      totalViews: totalViews._sum.viewCount || 0,
      totalLikes: totalLikes._sum.likeCount || 0,
      popularCategories: popularCategories.map((cat) => ({
        category: cat.category,
        count: cat._count.category,
      })),
    };
  }

  // Search blogs with advanced filtering
  async searchBlogs(query: string, filters?: Partial<BlogQueryDto>) {
    const where: any = {
      status: BlogStatus.PUBLISHED, // Only search published blogs for public
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    };
    if (filters.isForDentist !== undefined) {
      where.isForDentist = filters.isForDentist;
    }
    if (filters?.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    const blogs = await this.prisma.blog.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: 20, // Limit search results
    });

    return blogs;
  }

  // Get unique blog categories
  async getBlogCategories() {
    const categories = await this.prisma.blog.findMany({
      where: {
        category: { not: null },
        status: BlogStatus.PUBLISHED, // Only get categories from published blogs
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    return categories
      .map((blog) => blog.category)
      .filter((category): category is string => !!category);
  }
}
