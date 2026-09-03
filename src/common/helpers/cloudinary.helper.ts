import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  originalName: string;
  size: number;
}

/**
 * Tuỳ chọn ghi đè chỗ lưu file. Bỏ trống thì giữ nguyên hành vi mặc định:
 * thư mục `images`/`files` và public_id lấy theo tên file gốc.
 * Truyền `publicId` riêng khi tên file gốc có thể trùng giữa các người dùng
 * (ví dụ ảnh đại diện), vì public_id trùng nhau sẽ ghi đè lên file của nhau.
 */
export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  private resolveResourceType(mimetype: string): 'image' | 'video' | 'raw' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/') || mimetype.startsWith('audio/'))
      return 'video';
    return 'raw';
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 100);
  }

  async uploadFile(
    file: MulterFile,
    options: CloudinaryUploadOptions = {},
  ): Promise<CloudinaryUploadResult> {
    const resourceType = this.resolveResourceType(file.mimetype);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder:
            options.folder ?? (resourceType === 'image' ? 'images' : 'files'),
          use_filename: true,
          unique_filename: true,
          public_id:
            options.publicId ?? this.sanitizeFileName(file.originalname),
        },
        (
          uploadError: Error | undefined,
          uploadResult: UploadApiResponse | undefined,
        ) => {
          if (uploadError) {
            console.log('CLOUDINARY ERROR:', uploadError.message);
            reject(new Error(uploadError.message));
            return;
          }
          if (!uploadResult) {
            reject(new Error('Cloudinary trả về kết quả rỗng'));
            return;
          }
          resolve(uploadResult);
        },
      );

      uploadStream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      originalName: file.originalname,
      size: file.size,
    };
  }

  async uploadMultipleFiles(
    files: MulterFile[],
  ): Promise<CloudinaryUploadResult[]> {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }
}
