import { role_code } from '@prisma/client';

/**
 * "Đăng nhập mồi" cho admin khi DB chưa được seed (bảng users/roles trống trên
 * server mới deploy). Khi chưa có user `admin@gmail.com`, login bằng email này +
 * mật khẩu bootstrap sẽ tự tạo role ADMIN + user admin thật vào DB rồi cấp token
 * bình thường. Một khi user admin đã tồn tại, luồng này không còn được kích hoạt
 * (login đi theo password_hash trong DB).
 */
export const BOOTSTRAP_ADMIN_EMAIL = 'admin@gmail.com';
export const BOOTSTRAP_ADMIN_USERNAME = 'admin';
export const BOOTSTRAP_ADMIN_FULL_NAME = 'Nguyễn Quản Trị';

/**
 * Mật khẩu mặc định của đường mồi, dùng khi không đặt env `BOOTSTRAP_ADMIN_PASSWORD`.
 * Trùng `DEFAULT_PASSWORD` trong `prisma/seed.mts` và đủ 8 ký tự để thỏa `LoginDto`.
 */
export const BOOTSTRAP_ADMIN_DEFAULT_PASSWORD = '12341234';

/**
 * Bộ role chuẩn của hệ thống — dùng để tạo bảng `roles` khi nó còn trống.
 * Nội dung khớp `roleDetails` trong `prisma/seed.mts` để nhất quán với seed.
 */
export const DEFAULT_ROLES: Array<{
  code: role_code;
  name: string;
  description: string;
}> = [
  {
    code: role_code.ADMIN,
    name: 'Quản trị viên',
    description: 'Quản lý tài khoản và toàn bộ hệ thống.',
  },
  {
    code: role_code.LEAD,
    name: 'Trưởng nhóm',
    description: 'Quản lý dự án, giao việc và phê duyệt.',
  },
  {
    code: role_code.BA,
    name: 'Chuyên viên phân tích',
    description: 'Phân tích nghiệp vụ và tạo công việc.',
  },
  {
    code: role_code.USER,
    name: 'Người dùng',
    description: 'Thành viên thực hiện công việc.',
  },
];
