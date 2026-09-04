import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint công khai để hosting kiểm tra tiến trình còn sống.
 * Cố ý KHÔNG truy vấn database: Render ping liên tục, còn Neon free tự
 * suspend compute khi rảnh — query mỗi lần ping sẽ giữ database thức 24/7.
 */
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return this.buildStatus();
  }

  @Get()
  root() {
    return this.buildStatus();
  }

  private buildStatus() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
