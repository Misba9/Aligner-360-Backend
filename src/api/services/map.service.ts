import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRole } from 'src/guards/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async getCoordinates(location: string) {
    try {
      // Build the URL with query parameters
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.append('q', location);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '1');
      url.searchParams.append('addressdetails', '1');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'DentistPortal/1.0', // Required by Nominatim
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(
          `Geocoding API error: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name,
        };
      }

      this.logger.warn(`No coordinates found for location: ${location}`);
      return null;
    } catch (error) {
      this.logger.error('Error getting coordinates:', error.message);
      return null;
    }
  }

  async updateUserLocationOnMap(userId: string, location: string) {
    try {
      if (!userId || !location) {
        throw new Error('Missing userId or location');
      }
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const coordinates = await this.getCoordinates(location);
      if (!coordinates) {
        throw new Error('Could not geocode the provided location');
      }
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      });
    } catch (error) {
      this.logger.error('Error updating user location:', error.message);
    }
  }

  async getAllUsersWithCoordinates() {
    try {
      const users = await this.prismaService.user.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          showOnMap: true,
          NOT: { role: UserRole.ADMIN },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          clinicName: true,
          location: true,
          latitude: true,
          longitude: true,
          phone: true,
        },
      });

      return {
        success: true,
        users,
        count: users.length,
      };
    } catch (error) {
      this.logger.error(
        'Error fetching users with coordinates:',
        error.message,
      );
      throw new Error('Failed to fetch users for map');
    }
  }
}
