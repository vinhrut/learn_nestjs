import { Controller, Post } from '@nestjs/common';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  /**
   * Endpoint để migrate database và seed roles
   * Không cần auth - chỉ dùng để setup ban đầu
   */
  @Post('migrate')
  async migrateDatabase() {
    return this.setupService.migrateAndSeed();
  }
}
