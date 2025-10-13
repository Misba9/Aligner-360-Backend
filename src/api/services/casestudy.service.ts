import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  Gender,
} from '../dto/casestudy.dto';

export interface CaseStudyQueryDto {
  page?: string;
  limit?: string;
  search?: string;
  gender?: Gender;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CaseStudyService {
  constructor(private readonly prisma: PrismaService) {} // Create a new case study
  async createCaseStudy(createCaseStudyDto: CreateCaseStudyDto): Promise<any> {
    try {
      const caseStudy = await this.prisma.caseStudy.create({
        data: {
          name: createCaseStudyDto.name,
          age: createCaseStudyDto.age,
          case: createCaseStudyDto.case,
          gender: createCaseStudyDto.gender,
          upper: createCaseStudyDto.upper,
          lower: createCaseStudyDto.lower,
          imageBefore: createCaseStudyDto.imageBefore || '',
          imageAfter: createCaseStudyDto.imageAfter || '',
        },
      });

      return caseStudy;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create case study: ${error.message}`,
      );
    }
  }

  // Get all case studies with filtering and pagination
  async getAllCaseStudies(query: CaseStudyQueryDto) {
    const {
      search,
      gender,
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
        { name: { contains: search, mode: 'insensitive' } },
        { upper: { contains: search, mode: 'insensitive' } },
        { lower: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gender) {
      where.gender = gender;
    }

    // Get total count
    const total = await this.prisma.caseStudy.count({ where });

    // Get case studies
    const caseStudies = await this.prisma.caseStudy.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: +limitNum,
    });

    return {
      data: caseStudies,
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

  // Get case study by ID
  async getCaseStudyById(id: string) {
    const caseStudy = await this.prisma.caseStudy.findUnique({
      where: { id },
    });

    if (!caseStudy) {
      throw new NotFoundException('Case study not found');
    }

    return caseStudy;
  }

  // Update case study
  async updateCaseStudy(id: string, updateCaseStudyDto: UpdateCaseStudyDto) {
    const existingCaseStudy = await this.prisma.caseStudy.findUnique({
      where: { id },
    });

    if (!existingCaseStudy) {
      throw new NotFoundException('Case study not found');
    }

    const updateData: any = {};

    // Only update provided fields
    if (updateCaseStudyDto.name !== undefined) {
      updateData.name = updateCaseStudyDto.name;
    }
    if (updateCaseStudyDto.age !== undefined) {
      updateData.age = updateCaseStudyDto.age;
    }
    if (updateCaseStudyDto.gender !== undefined) {
      updateData.gender = updateCaseStudyDto.gender;
    }
    if (updateCaseStudyDto.upper !== undefined) {
      updateData.upper = updateCaseStudyDto.upper;
    }
    if (updateCaseStudyDto.lower !== undefined) {
      updateData.lower = updateCaseStudyDto.lower;
    }
    if (updateCaseStudyDto.imageBefore !== undefined) {
      updateData.imageBefore = updateCaseStudyDto.imageBefore;
    }
    if (updateCaseStudyDto.imageAfter !== undefined) {
      updateData.imageAfter = updateCaseStudyDto.imageAfter;
    }
    if (updateCaseStudyDto.case !== undefined) {
      updateData.case = updateCaseStudyDto.case;
    }

    const updatedCaseStudy = await this.prisma.caseStudy.update({
      where: { id },
      data: updateData,
    });

    return updatedCaseStudy;
  }

  // Delete case study
  async deleteCaseStudy(id: string) {
    const existingCaseStudy = await this.prisma.caseStudy.findUnique({
      where: { id },
    });

    if (!existingCaseStudy) {
      throw new NotFoundException('Case study not found');
    }

    await this.prisma.caseStudy.delete({
      where: { id },
    });

    return { message: 'Case study deleted successfully' };
  }
}
