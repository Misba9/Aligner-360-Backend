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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { CourseService } from '../services/course.service';
import { ImageKitService } from '../services/imagekit.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CourseQueryDto,
  PublishCourseDto,
} from '../dto/course.dto';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly imagekitService: ImageKitService,
  ) {}

  // Helper method to validate MongoDB ObjectID
  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectID is a 24-character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // ==================== ADMIN ROUTES ====================
  /**
   * Create a new course (Admin only)
   * POST /api/v1/courses
   */ @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnailImage', maxCount: 1 },
      { name: 'videoFile', maxCount: 1 },
    ]),
  )
  async createCourse(
    @Body(ValidationPipe) createCourseDto: CreateCourseDto,
    @UploadedFiles()
    files: {
      thumbnailImage?: Express.Multer.File[];
      videoFile?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Transform data first to validate early
      const transformedDto = {
        ...createCourseDto,
        // Transform boolean fields (FormData converts booleans to strings)
        isFreeCourse:
          (createCourseDto.isFreeCourse as any) === 'true' ||
          createCourseDto.isFreeCourse === true,
        isActive:
          (createCourseDto.isActive as any) === 'true' ||
          createCourseDto.isActive === true,
        // Transform number fields
        price:
          typeof createCourseDto.price === 'string'
            ? parseFloat(createCourseDto.price)
            : createCourseDto.price,
        maxEnrollments: createCourseDto.maxEnrollments
          ? typeof createCourseDto.maxEnrollments === 'string'
            ? parseInt(createCourseDto.maxEnrollments as string)
            : createCourseDto.maxEnrollments
          : undefined,
        // Transform array fields (tags come as comma-separated string from FormData)
        tags: Array.isArray(createCourseDto.tags)
          ? createCourseDto.tags
          : typeof createCourseDto.tags === 'string' && createCourseDto.tags
            ? (createCourseDto.tags as string)
                .split(',')
                .map((tag) => tag.trim())
            : [],
      };

      // Create course first without files
      const course = await this.courseService.createCourse(
        transformedDto,
        req.user.id,
      );

      // Handle file uploads asynchronously after course creation
      if (files?.thumbnailImage?.[0] || files?.videoFile?.[0]) {
        // Process files in background without blocking response
        this.processFileUploadsAsync(course.id, files);
      }

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Course created successfully',
        data: course,
      });
    } catch (error) {
      console.error('Error creating course:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create course',
      });
    }
  }

  private async processFileUploadsAsync(
    courseId: string,
    files: {
      thumbnailImage?: Express.Multer.File[];
      videoFile?: Express.Multer.File[];
    },
  ) {
    try {
      const uploadPromises = [];
      const uploadedFiles: any = {};

      // Upload thumbnail image if provided
      if (files?.thumbnailImage?.[0]) {
        const thumbnailFile = files.thumbnailImage[0];

        // Validate thumbnail image
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        if (
          allowedImageTypes.includes(thumbnailFile.mimetype) &&
          thumbnailFile.size <= 5 * 1024 * 1024
        ) {
          uploadPromises.push(
            this.imagekitService
              .uploadFile(
                thumbnailFile.buffer,
                thumbnailFile.originalname,
                'course-thumbnails',
                true,
                ['course', 'thumbnail'],
              )
              .then((result) => {
                uploadedFiles.thumbnailImage = result.url;
              })
              .catch((error) => {
                console.error('Thumbnail upload failed:', error);
              }),
          );
        }
      }

      // Upload video file if provided
      if (files?.videoFile?.[0]) {
        const videoFile = files.videoFile[0];

        // Validate video file
        const allowedVideoTypes = [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
        ];

        if (
          allowedVideoTypes.includes(videoFile.mimetype) &&
          videoFile.size <= 100 * 1024 * 1024
        ) {
          uploadPromises.push(
            this.imagekitService
              .uploadFile(
                videoFile.buffer,
                videoFile.originalname,
                'course-videos',
                true,
                ['course', 'video'],
              )
              .then((result) => {
                uploadedFiles.videoFile = result.url;
              })
              .catch((error) => {
                console.error('Video upload failed:', error);
              }),
          );
        }
      }

      // Wait for uploads and update course
      if (uploadPromises.length > 0) {
        await Promise.allSettled(uploadPromises);

        // Update course with file URLs
        if (Object.keys(uploadedFiles).length > 0) {
          await this.courseService.updateCourse(courseId, uploadedFiles);
        }
      }
    } catch (error) {
      console.error('Background file upload processing failed:', error);
    }
  }

  /**
   * Get all courses with admin privileges (filtering, pagination, all statuses)
   * GET /api/v1/courses/admin
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAllCoursesAdmin(
    @Query() query: CourseQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.courseService.getAllCourses(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Courses retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Get course statistics (Admin only)
   * GET /api/v1/courses/admin/statistics
   */
  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getCourseStatistics(@Res() res: Response) {
    const stats = await this.courseService.getCourseStatistics();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Course statistics retrieved successfully',
      data: stats,
    });
  }
  /**
   * Update a course (Admin only)
   * PUT /api/v1/courses/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnailImage', maxCount: 1 },
      { name: 'videoFile', maxCount: 1 },
    ]),
  )
  async updateCourse(
    @Param('id') id: string,
    @Body(ValidationPipe) updateCourseDto: UpdateCourseDto,
    @UploadedFiles()
    files: {
      thumbnailImage?: Express.Multer.File[];
      videoFile?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid course ID format',
        });
      }
      // Handle file uploads to ImageKit (similar to create method)
      const uploadPromises = [];
      const uploadedFiles: any = {};

      // Upload thumbnail image if provided
      if (files?.thumbnailImage && files.thumbnailImage[0]) {
        const thumbnailFile = files.thumbnailImage[0];

        // Validate thumbnail image
        const allowedImageTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedImageTypes.includes(thumbnailFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Thumbnail image must be JPEG, PNG, or WebP format',
          });
        }

        if (thumbnailFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Thumbnail image size must be less than 5MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              thumbnailFile.buffer,
              thumbnailFile.originalname,
              'course-thumbnails',
              true,
              ['course', 'thumbnail'],
            )
            .then((result) => {
              uploadedFiles.thumbnailImage = result.url;
            }),
        );
      }

      // Upload video file if provided
      if (files?.videoFile && files.videoFile[0]) {
        const videoFile = files.videoFile[0];

        // Validate video file
        const allowedVideoTypes = [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
        ];
        if (!allowedVideoTypes.includes(videoFile.mimetype)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message:
              'Video file must be MP4, MPEG, QuickTime, AVI, or WebM format',
          });
        }

        if (videoFile.size > 100 * 1024 * 1024) {
          // 100MB limit
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Video file size must be less than 100MB',
          });
        }

        uploadPromises.push(
          this.imagekitService
            .uploadFile(
              videoFile.buffer,
              videoFile.originalname,
              'course-videos',
              true,
              ['course', 'video'],
            )
            .then((result) => {
              uploadedFiles.videoFile = result.url;
            }),
        );
      } // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Transform boolean and number fields from strings (FormData converts everything to strings)
      const transformedDto = {
        ...updateCourseDto,
      };

      // Transform boolean fields only if they exist (FormData converts booleans to strings)
      if (updateCourseDto.isFreeCourse !== undefined) {
        transformedDto.isFreeCourse =
          (updateCourseDto.isFreeCourse as any) === 'true' ||
          updateCourseDto.isFreeCourse === true;
      }
      if (updateCourseDto.isActive !== undefined) {
        transformedDto.isActive =
          (updateCourseDto.isActive as any) === 'true' ||
          updateCourseDto.isActive === true;
      }

      // Transform number fields only if they exist
      if (updateCourseDto.price !== undefined) {
        transformedDto.price =
          typeof updateCourseDto.price === 'string'
            ? parseFloat(updateCourseDto.price)
            : updateCourseDto.price;
      }
      if (updateCourseDto.maxEnrollments !== undefined) {
        transformedDto.maxEnrollments =
          typeof updateCourseDto.maxEnrollments === 'string'
            ? parseInt(updateCourseDto.maxEnrollments as string)
            : updateCourseDto.maxEnrollments;
      }

      // Transform array fields (tags come as comma-separated string from FormData)
      if (updateCourseDto.tags !== undefined) {
        if (Array.isArray(updateCourseDto.tags)) {
          transformedDto.tags = updateCourseDto.tags;
        } else if (
          typeof updateCourseDto.tags === 'string' &&
          updateCourseDto.tags
        ) {
          transformedDto.tags = (updateCourseDto.tags as string)
            .split(',')
            .map((tag) => tag.trim());
        } else {
          transformedDto.tags = [];
        }
      }

      const courseDataWithFiles = {
        ...transformedDto,
        ...uploadedFiles,
      };

      const course = await this.courseService.updateCourse(
        id,
        courseDataWithFiles,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Course updated successfully',
        data: course,
      });
    } catch (error) {
      console.error('Error updating course:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update course',
      });
    }
  }

  /**
   * Publish a course (Admin only)
   * PATCH /api/v1/courses/:id/publish
   */
  @Patch(':id/publish')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async publishCourse(
    @Param('id') id: string,
    @Body(ValidationPipe) publishCourseDto: PublishCourseDto,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    const course = await this.courseService.publishCourse(id, publishCourseDto);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Course published successfully',
      data: course,
    });
  }

  /**
   * Unpublish a course (Admin only)
   * PATCH /api/v1/courses/:id/unpublish
   */
  @Patch(':id/unpublish')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async unpublishCourse(@Param('id') id: string, @Res() res: Response) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }

    const course = await this.courseService.unpublishCourse(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Course unpublished successfully',
      data: course,
    });
  }

  /**
   * Delete a course (Admin only)
   * DELETE /api/v1/courses/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async deleteCourse(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }

    const result = await this.courseService.deleteCourse(
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
   * Get all published courses (Public access)
   * GET /api/v1/courses
   */
  @Get()
  async getPublishedCourses(
    @Query() query: CourseQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.courseService.getPublishedCourses(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Published courses retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Search courses (Public access)
   * GET /api/v1/courses/search?q=searchterm
   */
  @Get('search')
  async searchCourses(
    @Query('q') query: string,
    @Query() filters: CourseQueryDto,
    @Res() res: Response,
  ) {
    if (!query) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const courses = await this.courseService.searchCourses(query, filters);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: courses,
      query,
    });
  }

  /**
   * Get course by slug (Public access for published, Admin for all)
   * GET /api/v1/courses/slug/:slug
   */
  @Get('slug/:slug')
  async getCourseBySlug(
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

    const course = await this.courseService.getCourseBySlug(slug, userRole);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Course retrieved successfully',
      data: course,
    });
  }
  /**
   * Get course by ID (Public access for published, Admin for all)
   * GET /api/v1/courses/:id
   */
  @Get(':id')
  async getCourseById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }

    const course = await this.courseService.getCourseById(id);

    // Check if user can access this course
    let userRole: UserRole | undefined;
    try {
      const token = req.cookies?.access_token;
      if (token && req.user) {
        userRole = req.user.role;
      }
    } catch (error) {
      // User is not authenticated
    }

    // If course is not published and user is not admin, throw error
    if (course.status !== 'PUBLISHED' && userRole !== UserRole.ADMIN) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Course not found',
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Course retrieved successfully',
      data: course,
    });
  }

  // ==================== ENROLLMENT ROUTES ====================

  /**
   * Enroll in a course (Authenticated users)
   * POST /api/v1/courses/:id/enroll
   */
  @Post(':id/enroll')
  @UseGuards(AuthGuard)
  async enrollInCourse(
    @Param('id') courseId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(courseId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }

    const enrollment = await this.courseService.enrollInCourse(
      courseId,
      req.user.id,
    );

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: enrollment,
    });
  }

  /**
   * Get my enrollments (Authenticated users)
   * GET /api/v1/courses/my-enrollments
   */
  @Get('enrollment/my-enrollments')
  @UseGuards(AuthGuard)
  async getMyEnrollments(
    @Query() query: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseService.getUserEnrollments(
      req.user.id,
      query,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Enrollments retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Update enrollment progress (Authenticated users)
   * PATCH /api/v1/courses/enrollments/:id/progress
   */
  @Patch('enrollments/:id/progress')
  @UseGuards(AuthGuard)
  async updateEnrollmentProgress(
    @Param('id') enrollmentId: string,
    @Body('progress') progress: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(enrollmentId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid enrollment ID format',
      });
    }

    const enrollment = await this.courseService.updateEnrollmentProgress(
      enrollmentId,
      req.user.id,
      progress,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Progress updated successfully',
      data: enrollment,
    });
  }

  /**
   * Cancel enrollment (Authenticated users)
   * DELETE /api/v1/courses/enrollments/:id
   */
  @Delete('enrollments/:id')
  @UseGuards(AuthGuard)
  async cancelEnrollment(
    @Param('id') enrollmentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(enrollmentId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid enrollment ID format',
      });
    }

    await this.courseService.cancelEnrollment(enrollmentId, req.user.id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Enrollment cancelled successfully',
    });
  }

  /**
   * Get course enrollments (Admin only)
   * GET /api/v1/courses/:id/enrollments
   */
  @Get(':id/enrollments')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getCourseEnrollments(
    @Param('id') courseId: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    // Validate MongoDB ObjectID format
    if (!this.isValidObjectId(courseId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid course ID format',
      });
    }
    const result = await this.courseService.getCourseEnrollments(
      courseId,
      query,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Course enrollments retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }
}
