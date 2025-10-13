import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUrl,
} from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsBoolean()
  useUniqueFileName?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UploadFromUrlDto {
  @IsUrl()
  url: string;

  @IsString()
  fileName: string;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsBoolean()
  useUniqueFileName?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ListFilesDto {
  @IsOptional()
  @IsNumber()
  skip?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

export class DeleteFilesDto {
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];
}

export class UpdateFileDetailsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  customCoordinates?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeAITags?: string[];
}

export class CopyFileDto {
  @IsString()
  sourceFilePath: string;

  @IsString()
  destinationPath: string;

  @IsOptional()
  @IsBoolean()
  includeFileVersions?: boolean;
}

export class MoveFileDto {
  @IsString()
  sourceFilePath: string;

  @IsString()
  destinationPath: string;
}

export class RenameFileDto {
  @IsString()
  filePath: string;

  @IsString()
  newFileName: string;

  @IsOptional()
  @IsBoolean()
  purgeCache?: boolean;
}

export class CreateFolderDto {
  @IsString()
  folderName: string;

  @IsOptional()
  @IsString()
  parentFolderPath?: string;
}

export class DeleteFolderDto {
  @IsString()
  folderPath: string;
}

export class PurgeCacheDto {
  @IsUrl()
  url: string;
}

export class GenerateUrlDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  urlEndpoint?: string;

  @IsOptional()
  transformation?: Array<{
    height?: number;
    width?: number;
    aspectRatio?: string;
    quality?: number;
    crop?: string;
    cropMode?: string;
    focus?: string;
    format?: string;
    radius?: number;
    bg?: string;
    border?: string;
    rotation?: number;
    blur?: number;
    named?: string;
  }>;

  @IsOptional()
  @IsString()
  transformationPosition?: string;

  @IsOptional()
  queryParameters?: Record<string, string | number>;

  @IsOptional()
  @IsBoolean()
  signed?: boolean;

  @IsOptional()
  @IsNumber()
  expireSeconds?: number;
}
