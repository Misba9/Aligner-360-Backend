import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
  IsObject,
  MaxLength,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

export class CreateDentistProfileDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  clinicName: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string; // We'll validate format on frontend

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  address: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  state: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zipCode: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsNotEmpty()
  @IsObject()
  openingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsUrl()
  website?: string;
}

export class UpdateDentistProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clinicName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsObject()
  openingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsUrl()
  website?: string;
}

export class DentistQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search in clinic name, description

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  latitude?: string; // For radius search

  @IsOptional()
  @IsString()
  longitude?: string; // For radius search

  @IsOptional()
  @IsString()
  radius?: string; // In kilometers

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class VerifyDentistDto {
  @IsNotEmpty()
  @IsBoolean()
  isVerified: boolean;
}
