import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMapUserDto,
  UpdateMapUserDto,
  MapUserQuery,
} from '../dto/mapusers.dto';
import { MapService } from './map.service';

@Injectable()
export class MapUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapService: MapService,
  ) {}

  // Create a new map user (Admin only)
  async createMapUser(createMapUserDto: CreateMapUserDto) {
    const { phone, location, ...rest } = createMapUserDto;

    // Check if phone number already exists
    const existingUser = await this.prisma.mapUsers.findFirst({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const coordinates = await this.mapService.getCoordinates(location);

    if (!coordinates) {
      throw new Error('Could not geocode the provided location');
    }

    const mapUser = await this.prisma.mapUsers.create({
      data: {
        phone,
        ...rest,
        showOnMap: createMapUserDto.showOnMap ?? false,
        location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    });

    return mapUser;
  }

  // Get all map users with filtering and pagination (Admin only)
  async getAllMapUsers(query: MapUserQuery) {
    const {
      search,
      showOnMap,
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
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
        { zipCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (showOnMap !== undefined) {
      where.showOnMap = showOnMap;
    }

    // Build sort condition
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [mapUsers, total] = await Promise.all([
      this.prisma.mapUsers.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
      }),
      this.prisma.mapUsers.count({ where }),
    ]);

    return {
      data: mapUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  // Get map user by ID (Admin only)
  async getMapUserById(id: string) {
    const mapUser = await this.prisma.mapUsers.findUnique({
      where: { id },
    });

    if (!mapUser) {
      throw new NotFoundException('Map user not found');
    }

    return mapUser;
  }

  // Update map user (Admin only)
  async updateMapUser(id: string, updateMapUserDto: UpdateMapUserDto) {
    const existingUser = await this.prisma.mapUsers.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Map user not found');
    }

    // If phone is being updated, check for conflicts
    if (
      updateMapUserDto.phone &&
      updateMapUserDto.phone !== existingUser.phone
    ) {
      const phoneExists = await this.prisma.mapUsers.findFirst({
        where: {
          phone: updateMapUserDto.phone,
          id: { not: id },
        },
      });

      if (phoneExists) {
        throw new ConflictException(
          'A user with this phone number already exists',
        );
      }
    }
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (updateMapUserDto.location) {
      coordinates = await this.mapService.getCoordinates(
        updateMapUserDto.location,
      );
      if (!coordinates) {
        throw new Error('Could not geocode the provided location');
      }
    }

    const updatedUser = await this.prisma.mapUsers.update({
      where: { id },
      data: {
        ...updateMapUserDto,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      },
    });

    return updatedUser;
  }

  // Toggle showOnMap status (Admin only)
  async toggleShowOnMap(id: string, showOnMap: boolean) {
    const existingUser = await this.prisma.mapUsers.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Map user not found');
    }

    const updatedUser = await this.prisma.mapUsers.update({
      where: { id },
      data: { showOnMap },
    });

    return updatedUser;
  }

  // Delete map user (Admin only)
  async deleteMapUser(id: string) {
    const existingUser = await this.prisma.mapUsers.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Map user not found');
    }

    await this.prisma.mapUsers.delete({
      where: { id },
    });

    return { message: 'Map user deleted successfully' };
  }

  // Get map users statistics (Admin only)
  async getMapUsersStatistics() {
    const [totalMapUsers, visibleMapUsers, hiddenMapUsers] = await Promise.all([
      this.prisma.mapUsers.count(),
      this.prisma.mapUsers.count({ where: { showOnMap: true } }),
      this.prisma.mapUsers.count({ where: { showOnMap: false } }),
    ]);

    // Get popular locations
    const popularLocations = await this.prisma.mapUsers.groupBy({
      by: ['location'],
      _count: { location: true },
      orderBy: {
        _count: { location: 'desc' },
      },
      take: 10,
    });

    return {
      totalMapUsers,
      visibleMapUsers,
      hiddenMapUsers,
      popularLocations: popularLocations.map((loc) => ({
        location: loc.location,
        count: loc._count.location,
      })),
    };
  }

  // Get all visible map users for public display
  async getVisibleMapUsers() {
    const mapUsers = await this.prisma.mapUsers.findMany({
      where: { showOnMap: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        location: true,
        clinicName: true,
        zipCode: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: mapUsers,
      count: mapUsers.length,
    };
  }
}
