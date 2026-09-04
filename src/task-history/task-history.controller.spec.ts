import { Test, TestingModule } from '@nestjs/testing';
import { TaskHistoryController } from './task-history.controller';
import { TaskHistoryService } from './task-history.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TaskHistoryController', () => {
  let controller: TaskHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskHistoryController],
      providers: [
        {
          provide: TaskHistoryService,
          useValue: {
            findByTask: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TaskHistoryController>(TaskHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
