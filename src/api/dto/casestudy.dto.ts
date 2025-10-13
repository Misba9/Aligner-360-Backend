import { IsString, IsInt, IsEnum, IsUrl, IsNotEmpty } from 'class-validator';

export enum Gender {
  M = 'M',
  F = 'F',
}

export class CreateCaseStudyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  age: string;

  @IsString()
  @IsNotEmpty()
  case: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  upper: string;

  @IsString()
  @IsNotEmpty()
  lower: string;

  // These will be file uploads, not URLs initially
  imageBefore?: string;

  imageAfter?: string;
}

export class UpdateCaseStudyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  age: string;

  @IsString()
  @IsNotEmpty()
  case: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  upper: string;

  @IsString()
  @IsNotEmpty()
  lower: string;

  // These will be file uploads, not URLs initially
  imageBefore?: string;

  imageAfter?: string;
}
