import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
    format: string;
    resourceType: string;
    originalName: string;
    size: number;
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
        if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) return 'video';
        return 'raw';
    }

    private sanitizeFileName(name: string): string {
        return name
            .replace(/\.[^/.]+$/, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .slice(0, 100);
    }

    async uploadFile(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
        const resourceType = this.resolveResourceType(file.mimetype);

        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: resourceType === 'image' ? 'images' : 'files',
                    use_filename: true,
                    unique_filename: true,
                    public_id: this.sanitizeFileName(file.originalname),
                },
                (error, result) => {
                    if (error) {
                        console.log('CLOUDINARY ERROR:', error.message, error.http_code);
                        reject(error);
                        return;
                    }
                    if (!result) {
                        reject(new Error('Cloudinary trả về kết quả rỗng'));
                        return;
                    }
                    resolve(result);
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

    async uploadMultipleFiles(files: Express.Multer.File[]): Promise<CloudinaryUploadResult[]> {
        return Promise.all(files.map((file) => this.uploadFile(file)));
    }

    async deleteFile(
        publicId: string,
        resourceType: 'image' | 'video' | 'raw' = 'image',
    ): Promise<void> {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
}