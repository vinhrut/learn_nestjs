import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  testConnection() {
    return {
      success: true,
      message: 'Backend NestJS connected successfully!',
      timestamp: new Date().toISOString(),
    };
  }
}
