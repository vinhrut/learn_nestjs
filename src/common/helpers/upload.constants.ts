import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';

/** Giới hạn dung lượng cho file ảnh (avatar, ảnh hồ sơ...). */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** Các định dạng ảnh được chấp nhận khi upload. */
export const IMAGE_MIME_REGEX = /^image\/(jpeg|png|webp|gif)$/;

/**
 * Pipe validate file ảnh dùng chung cho mọi endpoint upload ảnh.
 * Dùng kèm `@UseInterceptors(FileInterceptor('file'))`:
 *
 *   @UploadedFile(imageFileValidationPipe()) file: Express.Multer.File
 */
export function imageFileValidationPipe(): ParseFilePipe {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE }),
      new FileTypeValidator({ fileType: IMAGE_MIME_REGEX }),
    ],
  });
}
