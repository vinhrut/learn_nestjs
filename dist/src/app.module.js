"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const roles_module_1 = require("./roles/roles.module");
const projects_module_1 = require("./projects/projects.module");
const tasks_module_1 = require("./tasks/tasks.module");
const notifications_module_1 = require("./notifications/notifications.module");
const comment_module_1 = require("./comment/comment.module");
const task_history_module_1 = require("./task-history/task-history.module");
const mail_module_1 = require("./mail/mail.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const realtime_module_1 = require("./realtime/realtime.module");
const task_vinh_module_1 = require("./task_vinh/task-vinh.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mail_module_1.MailModule,
            realtime_module_1.RealtimeModule,
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            roles_module_1.RolesModule,
            projects_module_1.ProjectsModule,
            tasks_module_1.TasksModule,
            notifications_module_1.NotificationsModule,
            comment_module_1.CommentModule,
            task_history_module_1.TaskHistoryModule,
            dashboard_module_1.DashboardModule,
            task_vinh_module_1.TaskVinhModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map