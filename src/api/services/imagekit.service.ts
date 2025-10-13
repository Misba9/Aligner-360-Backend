import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import ImageKit from 'imagekit';

// Handle both CommonJS and ES Module imports

@Injectable()
export class ImageKitService {
  private readonly logger = new Logger(ImageKitService.name);
  private imagekit: ImageKit;

  constructor() {
    this.initializeImageKit();
  }
  private initializeImageKit() {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    // Check if all required environment variables are present
    if (!publicKey || !privateKey || !urlEndpoint) {
      this.logger.error(
        'ImageKit configuration incomplete. Missing environment variables:',
      );
      if (!publicKey) this.logger.error('- IMAGEKIT_PUBLIC_KEY is missing');
      if (!privateKey) this.logger.error('- IMAGEKIT_PRIVATE_KEY is missing');
      if (!urlEndpoint) this.logger.error('- IMAGEKIT_URL_ENDPOINT is missing');
      return;
    }

    try {
      this.imagekit = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });
      this.logger.log('ImageKit initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ImageKit:', error.message);
    }
  }
   async uploadFile(
    file: Buffer | string,
    fileName: string,
    folder: string,
    useUniqueFileName: boolean = true,
    tags?: string[],
  ): Promise<{ fileId: string; url: string }> {
    if (!this.imagekit) {
      throw new BadRequestException('ImageKit is not properly configured');
    }

    try {
      const uploadOptions: any = {
        file,
        fileName,
        useUniqueFileName,
        folder: folder,
      };

      if (!folder) {
        throw new BadRequestException('Folder is required');
      }

      if (tags && tags.length > 0) {
        uploadOptions.tags = tags;
      }

      this.logger.log(
        `Starting upload for file: ${fileName} to folder: ${folder}`,
      );
      const result = await this.imagekit.upload(uploadOptions);

      this.logger.log(
        `File uploaded successfully: ${result.fileId} - ${result.url}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload file ${fileName}: ${error.message}`);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a file from URL
   */ async uploadFromUrl(
    url: string,
    fileName: string,
    folder?: string,
    useUniqueFileName: boolean = true,
    tags?: string[],
  ): Promise<any> {
    try {
      const uploadOptions: any = {
        file: url,
        fileName,
        useUniqueFileName,
        folder: folder || 'uploads',
      };

      if (tags && tags.length > 0) {
        uploadOptions.tags = tags;
      }

      const result = await this.imagekit.upload(uploadOptions);

      this.logger.log(`File uploaded from URL successfully: ${result.fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload file from URL: ${error.message}`);
      throw new BadRequestException(
        `Failed to upload file from URL: ${error.message}`,
      );
    }
  }

  /**
   * Get file details by fileId
   */ async getFileDetails(fileId: string): Promise<any> {
    try {
      const result = await this.imagekit.getFileDetails(fileId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get file details: ${error.message}`);
      throw new BadRequestException(
        `Failed to get file details: ${error.message}`,
      );
    }
  }

  /**
   * List files with optional search parameters
   */ async listFiles(options?: {
    skip?: number;
    limit?: number;
    searchQuery?: string;
    path?: string;
    tags?: string;
  }): Promise<any> {
    try {
      const result = await this.imagekit.listFiles(options || {});
      return result;
    } catch (error) {
      this.logger.error(`Failed to list files: ${error.message}`);
      throw new BadRequestException(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Delete a file by fileId
   */ async deleteFile(fileId: string): Promise<any> {
    try {
      const result = await this.imagekit.deleteFile(fileId);
      this.logger.log(`File deleted successfully: ${fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete multiple files by fileIds
   */ async deleteFiles(fileIds: string[]): Promise<any> {
    try {
      const result = await this.imagekit.bulkDeleteFiles(fileIds);
      this.logger.log(`${fileIds.length} files deleted successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete files: ${error.message}`);
      throw new BadRequestException(`Failed to delete files: ${error.message}`);
    }
  }

  /**
   * Generate authentication parameters for client-side upload
   */
  getAuthenticationParameters(token?: string, expire?: number): any {
    try {
      return this.imagekit.getAuthenticationParameters(token, expire);
    } catch (error) {
      this.logger.error(
        `Failed to generate authentication parameters: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to generate authentication parameters: ${error.message}`,
      );
    }
  }

  async updateFileDetails(
    fileId: string,
    updateData: {
      tags?: string[];
      customCoordinates?: string;
      removeAITags?: string[];
    },
  ): Promise<any> {
    try {
      const result = await this.imagekit.updateFileDetails(fileId, updateData);
      this.logger.log(`File details updated successfully: ${fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update file details: ${error.message}`);
      throw new BadRequestException(
        `Failed to update file details: ${error.message}`,
      );
    }
  }

  /**
   * Copy a file
   */
  async copyFile(
    sourceFilePath: string,
    destinationPath: string,
    includeFileVersions: boolean = false,
  ): Promise<any> {
    try {
      const result = await this.imagekit.copyFile({
        sourceFilePath,
        destinationPath,
        includeFileVersions,
      });
      this.logger.log(
        `File copied successfully from ${sourceFilePath} to ${destinationPath}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to copy file: ${error.message}`);
      throw new BadRequestException(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Move a file
   */
  async moveFile(
    sourceFilePath: string,
    destinationPath: string,
  ): Promise<any> {
    try {
      const result = await this.imagekit.moveFile({
        sourceFilePath,
        destinationPath,
      });
      this.logger.log(
        `File moved successfully from ${sourceFilePath} to ${destinationPath}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to move file: ${error.message}`);
      throw new BadRequestException(`Failed to move file: ${error.message}`);
    }
  }

  /**
   * Rename a file
   */
  async renameFile(
    filePath: string,
    newFileName: string,
    purgeCache: boolean = false,
  ): Promise<any> {
    try {
      const result = await this.imagekit.renameFile({
        filePath,
        newFileName,
        purgeCache,
      });
      this.logger.log(
        `File renamed successfully: ${filePath} to ${newFileName}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to rename file: ${error.message}`);
      throw new BadRequestException(`Failed to rename file: ${error.message}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(
    folderName: string,
    parentFolderPath: string = '/',
  ): Promise<any> {
    try {
      const result = await this.imagekit.createFolder({
        folderName,
        parentFolderPath,
      });
      this.logger.log(`Folder created successfully: ${folderName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create folder: ${error.message}`);
      throw new BadRequestException(
        `Failed to create folder: ${error.message}`,
      );
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderPath: string): Promise<any> {
    try {
      const result = await this.imagekit.deleteFolder(folderPath);
      this.logger.log(`Folder deleted successfully: ${folderPath}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete folder: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete folder: ${error.message}`,
      );
    }
  }

  /**
   * Get bulk job status
   */
  async getBulkJobStatus(jobId: string): Promise<any> {
    try {
      const result = await this.imagekit.getBulkJobStatus(jobId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get bulk job status: ${error.message}`);
      throw new BadRequestException(
        `Failed to get bulk job status: ${error.message}`,
      );
    }
  }

  /**
   * Purge cache for a file
   */
  async purgeCache(url: string): Promise<any> {
    try {
      const result = await this.imagekit.purgeCache(url);
      this.logger.log(`Cache purged successfully for: ${url}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to purge cache: ${error.message}`);
      throw new BadRequestException(`Failed to purge cache: ${error.message}`);
    }
  }

  /**
   * Get purge cache status
   */
  async getPurgeCacheStatus(requestId: string): Promise<any> {
    try {
      const result = await this.imagekit.getPurgeCacheStatus(requestId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get purge cache status: ${error.message}`);
      throw new BadRequestException(
        `Failed to get purge cache status: ${error.message}`,
      );
    }
  }
}
