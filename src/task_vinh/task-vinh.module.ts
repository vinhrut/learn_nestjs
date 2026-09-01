import { Module } from '@nestjs/common';
import { TaskVinhController } from './task-vinh.controller';
import { TaskVinhService } from './task-vinh.service';

/**
 * Base flow "admin giao task xuống user" — đóng gói kín để thử nghiệm.
 *
 * Không cần `imports`: `PrismaModule`, `MailModule`, `RealtimeModule` đều `@Global()`.
 * Không `exports` gì — module này không phục vụ module khác.
 */
@Module({
  controllers: [TaskVinhController],
  providers: [TaskVinhService],
})
export class TaskVinhModule {}
