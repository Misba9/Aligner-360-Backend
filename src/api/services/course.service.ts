import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CourseQueryDto,
  CourseStatus,
  PublishCourseDto,
} from '../dto/course.dto';
import { UserRole } from '../../guards/auth.guard';

@Injectable()
export class CourseService {
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

      const existingCourse = await this.prisma.course.findUnique({ where });

      if (!existingCourse) {
        return uniqueSlug;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }
  // Create a new course (Admin only)
  async createCourse(createCourseDto: CreateCourseDto, createdById: string) {
    const { title, slug, ...rest } = createCourseDto;

    let courseSlug = slug || this.generateSlug(title);
    courseSlug = await this.ensureUniqueSlug(courseSlug);

    const course = await this.prisma.course.create({
      data: {
        title,
        slug: courseSlug,
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
          },
        },
      },
    });

    return course;
  }
  // Get all courses with filtering and pagination
  async getAllCourses(query: CourseQueryDto) {
    const {
      search,
      status,
      createdById,
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
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    if (createdById) {
      where.createdById = createdById;
    }

    // Get total count for pagination
    const total = await this.prisma.course.count({ where });

    // Get courses
    const courses = await this.prisma.course.findMany({
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
      data: courses,
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

  // Get published courses for public viewing
  async getPublishedCourses(query: CourseQueryDto) {
    return this.getAllCourses({
      ...query,
      status: CourseStatus.PUBLISHED,
    });
  }

  // Get course by ID
  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Increment view count if published
    if (course.status === CourseStatus.PUBLISHED) {
      await this.prisma.course.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return course;
  }

  // Get course by slug
  async getCourseBySlug(slug: string, userRole?: UserRole) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Only allow non-admins to view published courses
    if (
      userRole !== UserRole.ADMIN &&
      course.status !== CourseStatus.PUBLISHED
    ) {
      throw new NotFoundException('Course not found');
    }

    // Increment view count if published
    if (course.status === CourseStatus.PUBLISHED) {
      await this.prisma.course.update({
        where: { id: course.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return course;
  }

  // Update course with file URLs (for async file uploads)
  async updateCourse(
    id: string,
    fileData: { thumbnailImage?: string; videoFile?: string },
  ) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new NotFoundException('Course not found');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: fileData,
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

    return updatedCourse;
  }

  // Publish course
  async publishCourse(id: string, publishCourseDto: PublishCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status === CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is already published');
    }

    const publishedAt = publishCourseDto.publishedAt
      ? new Date(publishCourseDto.publishedAt)
      : new Date();

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt,
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

    return updatedCourse;
  }

  // Unpublish course
  async unpublishCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is not published');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.DRAFT,
        publishedAt: null,
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

    return updatedCourse;
  }

  // Delete course (Admin only)
  async deleteCourse(id: string, userRole: UserRole, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && course.createdById !== userId) {
      throw new ForbiddenException(
        'You can only delete your own courses or you must be an admin',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { message: 'Course deleted successfully' };
  }

  // Get course statistics (Admin only)
  async getCourseStatistics() {
    const [
      totalCourses,
      publishedCourses,
      draftCourses,
      archivedCourses,
      totalViews,
      totalEnrollments,
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.prisma.course.count({ where: { status: CourseStatus.DRAFT } }),
      this.prisma.course.count({ where: { status: CourseStatus.ARCHIVED } }),
      this.prisma.course.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.course.aggregate({
        _sum: { enrollmentCount: true },
      }),
    ]);

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      archivedCourses,
      totalViews: totalViews._sum.viewCount || 0,
      totalEnrollments: totalEnrollments._sum.enrollmentCount || 0,
    };
  }

  // Search courses with advanced filtering
  async searchCourses(query: string, filters?: Partial<CourseQueryDto>) {
    const where: any = {
      status: CourseStatus.PUBLISHED, // Only search published courses for public
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    };

    if (filters?.createdById) {
      where.createdById = filters.createdById;
    }

    const courses = await this.prisma.course.findMany({
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
      orderBy: { publishedAt: 'desc' },
      take: 20, // Limit search results
    });

    return courses;
  }

  // Get unique course categories

  // Enroll user in course
  async enrollInCourse(courseId: string, userId: string) {
    // Check if course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is not available for enrollment');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('You are already enrolled in this course');
    }

    // Check enrollment limit
    if (course.maxEnrollments) {
      const currentEnrollments = await this.prisma.courseEnrollment.count({
        where: {
          courseId,
          status: 'ACTIVE',
        },
      });

      if (currentEnrollments >= course.maxEnrollments) {
        throw new BadRequestException('Course enrollment limit reached');
      }
    }

    // Create enrollment
    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        userId,
        courseId,
        amountPaid: course.isFreeCourse ? 0 : course.price,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailImage: true,
          },
        },
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

    // Update course enrollment count
    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        enrollmentCount: {
          increment: 1,
        },
      },
    });

    return enrollment;
  }

  // Get user enrollments
  async getUserEnrollments(userId: string, query?: any) {
    const { page = '1', limit = '10', status } = query || {};
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const total = await this.prisma.courseEnrollment.count({ where });
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            shortDescription: true,
            description: true,
            content: true,
            tags: true,
            thumbnailImage: true,
            videoUrl: true,
            videoFile: true,
            price: true,
            currency: true,
            isFreeCourse: true,
            status: true,
            maxEnrollments: true,
            enrollmentCount: true,
            viewCount: true,
            rating: true,
            reviewCount: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
      skip,
      take: limitNum,
    });

    return {
      data: enrollments,
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

  // Update enrollment progress
  async updateEnrollmentProgress(
    enrollmentId: string,
    userId: string,
    progress: number,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException('You can only update your own enrollment');
    }

    const updateData: any = { progress };

    // Mark as completed if progress is 100%
    if (progress >= 100 && !enrollment.completedAt) {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
    }

    const updatedEnrollment = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: updateData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailImage: true,
          },
        },
      },
    });

    return updatedEnrollment;
  }

  // Cancel enrollment
  async cancelEnrollment(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own enrollment');
    }

    const updatedEnrollment = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'CANCELLED',
      },
    });

    // Decrement course enrollment count
    await this.prisma.course.update({
      where: { id: enrollment.courseId },
      data: {
        enrollmentCount: {
          decrement: 1,
        },
      },
    });

    return updatedEnrollment;
  }

  // Get course enrollments (Admin only)
  async getCourseEnrollments(courseId: string, query?: any) {
    const { page = '1', limit = '10', status } = query || {};
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { courseId };
    if (status) {
      where.status = status;
    }

    const total = await this.prisma.courseEnrollment.count({ where });

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            isFreeCourse: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
      skip,
      take: limitNum,
    });

    return {
      data: enrollments,
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
}
