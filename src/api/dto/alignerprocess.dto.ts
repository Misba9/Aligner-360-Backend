import { IsOptional, IsUrl, IsString } from 'class-validator';

export class AlignerProcessDto {
  @IsOptional()
  @IsUrl({}, { message: 'Video URL must be a valid URL' })
  videoUrl?: string;

  @IsOptional()
  @IsString()
  videoFile?: string;
}
