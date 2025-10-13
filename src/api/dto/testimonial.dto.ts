import { IsOptional, IsString } from 'class-validator';

export class TestimonialDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  message: string;
}
