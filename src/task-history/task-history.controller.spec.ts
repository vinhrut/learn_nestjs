import { Test, TestingModule } from '@nestjs/testing';
import { TaskHistoryController } from './task-history.controller';

describe('TaskHistoryController', () => {
  let controller: TaskHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskHistoryController],
    }).compile();

    controller = module.get<TaskHistoryController>(TaskHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
