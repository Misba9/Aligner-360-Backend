import { Type } from 'class-transformer';
import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateMapUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  clinicName: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsBoolean()
  @IsOptional()
  showOnMap?: boolean;
}

export class UpdateMapUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  clinicName?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsBoolean()
  @IsOptional()
  showOnMap?: boolean;
}

export class MapUserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showOnMap?: boolean;
}

export interface MapUserQuery {
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showOnMap?: boolean;
}
