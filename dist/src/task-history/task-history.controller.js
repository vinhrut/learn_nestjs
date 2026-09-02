"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskHistoryController = void 0;
const common_1 = require("@nestjs/common");
const task_history_service_1 = require("./task-history.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const task_access_guard_1 = require("../auth/guards/task-access.guard");
let TaskHistoryController = class TaskHistoryController {
    taskHistoryService;
    constructor(taskHistoryService) {
        this.taskHistoryService = taskHistoryService;
    }
    findByTask(taskId) {
        return this.taskHistoryService.findByTask(taskId);
    }
};
exports.TaskHistoryController = TaskHistoryController;
__decorate([
    (0, common_1.UseGuards)(task_access_guard_1.TaskAccessGuard),
    (0, common_1.Get)(':taskId'),
    __param(0, (0, common_1.Param)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TaskHistoryController.prototype, "findByTask", null);
exports.TaskHistoryController = TaskHistoryController = __decorate([
    (0, common_1.Controller)('task-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [task_history_service_1.TaskHistoryService])
], TaskHistoryController);
//# sourceMappingURL=task-history.controller.js.map