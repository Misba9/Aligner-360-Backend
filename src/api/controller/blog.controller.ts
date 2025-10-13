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
import { BlogService } from '../services/blog.service';
import {
  CreateBlogDto,
  UpdateBlogDto,
  BlogQueryDto,
  PublishBlogDto,
  BlogServiceQuery,
} from '../dto/blog.dto';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { RolesGuard, Roles } from '../../guards/role.guard';

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async createBlog(
    @Body(ValidationPipe) createBlogDto: CreateBlogDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const blog = await this.blogService.createBlog(createBlogDto, req.user.id);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Blog created successfully',
      data: blog,
    });
  }

  /**
   * Get all blogs with admin privileges (filtering, pagination, all statuses)
   * GET /api/v1/blogs/admin
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getAllBlogsAdmin(@Query() query: BlogQueryDto, @Res() res: Response) {
    const result = await this.blogService.getAllBlogs(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blogs retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Get blog statistics (Admin only)
   * GET /api/v1/blogs/admin/statistics
   */
  @Get('admin/statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getBlogStatistics(@Res() res: Response) {
    const stats = await this.blogService.getBlogStatistics();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog statistics retrieved successfully',
      data: stats,
    });
  }

  /**
   * Update a blog (Admin only)
   * PUT /api/v1/blogs/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async updateBlog(
    @Param('id') id: string,
    @Body(ValidationPipe) updateBlogDto: UpdateBlogDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const blog = await this.blogService.updateBlog(
      id,
      updateBlogDto,
      req.user.role,
      req.user.id,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog,
    });
  }

  /**
   * Publish a blog (Admin only)
   * PATCH /api/v1/blogs/:id/publish
   */
  @Patch(':id/publish')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async publishBlog(
    @Param('id') id: string,
    @Body(ValidationPipe) publishBlogDto: PublishBlogDto,
    @Res() res: Response,
  ) {
    const blog = await this.blogService.publishBlog(id, publishBlogDto);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog published successfully',
      data: blog,
    });
  }

  /**
   * Unpublish a blog (Admin only)
   * PATCH /api/v1/blogs/:id/unpublish
   */
  @Patch(':id/unpublish')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async unpublishBlog(@Param('id') id: string, @Res() res: Response) {
    const blog = await this.blogService.unpublishBlog(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog unpublished successfully',
      data: blog,
    });
  }

  /**
   * Delete a blog (Admin only)
   * DELETE /api/v1/blogs/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async deleteBlog(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.blogService.deleteBlog(
      id,
      req.user.role,
      req.user.id,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  }

  @Get(':id/admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  async getBlogByIdAdmin(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const role = req.user.role;
    const blog = await this.blogService.getBlogById(id, role);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog retrieved successfully',
      data: blog,
    });
  }
  // ==================== PUBLIC ROUTES ====================

  /**
   * Get all published blogs (Public access)
   * GET /api/v1/blogs
   */
  private parseBoolean(
    value: string | boolean | undefined,
  ): boolean | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  }
  @Get('public')
  async getPublishedBlogs(@Query() query: BlogQueryDto, @Res() res: Response) {
    const isForDentist = this.parseBoolean(query.isForDentist);

    const serviceQuery: BlogServiceQuery = {
      ...query,
      isForDentist,
    };
    const result = await this.blogService.getPublishedBlogs(serviceQuery);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Published blogs retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * Search blogs (Public access)
   * GET /api/v1/blogs/search?q=searchterm
   */
  @Get('search')
  async searchBlogs(
    @Query('q') query: string,
    @Query() filters: BlogQueryDto,
    @Res() res: Response,
  ) {
    if (!query) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const blogs = await this.blogService.searchBlogs(query, filters);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: blogs,
      query,
    });
  }

  /**
   * Get unique blog categories (Public access)
   * GET /api/v1/blogs/categories
   */
  @Get('categories')
  async getBlogCategories(@Res() res: Response) {
    const categories = await this.blogService.getBlogCategories();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog categories retrieved successfully',
      data: categories,
    });
  }

  /**
   * Get blog by slug (Public access for published, Admin for all)
   * GET /api/v1/blogs/slug/:slug
   */
  @Get('slug/:slug')
  async getBlogBySlug(
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

    const blog = await this.blogService.getBlogBySlug(slug, userRole);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog retrieved successfully',
      data: blog,
    });
  }

  /**
   * Get blog by ID (Public access for published, Admin for all)
   * GET /api/v1/blogs/:id
   */
  @Get(':id')
  async getBlogById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const blog = await this.blogService.getBlogById(id, UserRole.USER);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Blog retrieved successfully',
      data: blog,
    });
  }
}
