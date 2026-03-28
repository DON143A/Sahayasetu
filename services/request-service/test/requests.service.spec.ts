import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestsService } from './requests.service';
import { HelpRequest } from './entities/request.entity';
import { RequestLog } from './entities/request-log.entity';
import {
  RequestStatus, RequestPriority, RequestCategory, UserRole,
} from '@sahayasetu/types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockRequest: Partial<HelpRequest> = {
  id: 'req-uuid-1',
  requestNumber: 'SS-ABCDEF-1234',
  title: 'Water leak in sector 5',
  description: 'There is a major water pipe leaking near the main road.',
  category: RequestCategory.REPAIR,
  priority: RequestPriority.HIGH,
  status: RequestStatus.PENDING,
  userId: 'user-uuid-1',
  location: { latitude: 13.0827, longitude: 80.2707 },
  mediaIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('RequestsService', () => {
  let service: RequestsService;
  let requestRepo: any;
  let logRepo: any;
  let emitter: any;

  beforeEach(async () => {
    requestRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({ getCount: jest.fn().mockResolvedValue(0) }),
    };
    logRepo = { create: jest.fn(), save: jest.fn() };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: getRepositoryToken(HelpRequest), useValue: requestRepo },
        { provide: getRepositoryToken(RequestLog), useValue: logRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should auto-detect CRITICAL priority from keywords', async () => {
      requestRepo.create.mockReturnValue({ ...mockRequest, priority: RequestPriority.CRITICAL });
      requestRepo.save.mockResolvedValue({ ...mockRequest, priority: RequestPriority.CRITICAL });
      logRepo.create.mockReturnValue({});
      logRepo.save.mockResolvedValue({});

      const result = await service.create('user-uuid-1', {
        title: 'Emergency flood situation',
        description: 'Flooding across the area requires urgent attention.',
        category: RequestCategory.EMERGENCY,
        location: { latitude: 13.0827, longitude: 80.2707 },
      });

      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: RequestPriority.CRITICAL }),
      );
    });

    it('should emit request.created event', async () => {
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      logRepo.create.mockReturnValue({});
      logRepo.save.mockResolvedValue({});

      await service.create('user-uuid-1', {
        title: 'Water leak',
        description: 'Pipe is leaking near sector 5 main road.',
        category: RequestCategory.REPAIR,
        location: { latitude: 13.0827, longitude: 80.2707 },
      });

      expect(emitter.emit).toHaveBeenCalledWith('request.created', expect.any(Object));
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should throw NotFoundException for missing request', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('bad-id', 'user-1', UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user accesses another users request', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, userId: 'other-user' });
      await expect(
        service.findOne('req-uuid-1', 'user-uuid-1', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return request for its owner', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, userId: 'user-uuid-1' });
      const result = await service.findOne('req-uuid-1', 'user-uuid-1', UserRole.USER);
      expect(result.id).toBe('req-uuid-1');
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should reject invalid status transitions', async () => {
      requestRepo.findOne.mockResolvedValue({
        ...mockRequest,
        status: RequestStatus.COMPLETED,
      });

      await expect(
        service.updateStatus(
          'req-uuid-1',
          { status: RequestStatus.PENDING },
          'admin-id',
          UserRole.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow PENDING → ASSIGNED for admin', async () => {
      const req = { ...mockRequest, status: RequestStatus.PENDING };
      requestRepo.findOne.mockResolvedValue(req);
      requestRepo.save.mockResolvedValue({ ...req, status: RequestStatus.ASSIGNED });
      logRepo.create.mockReturnValue({});
      logRepo.save.mockResolvedValue({});

      const result = await service.updateStatus(
        'req-uuid-1',
        { status: RequestStatus.ASSIGNED },
        'admin-id',
        UserRole.ADMIN,
      );

      expect(result.status).toBe(RequestStatus.ASSIGNED);
    });
  });

  // ── assign ─────────────────────────────────────────────────────────────────

  describe('assign', () => {
    it('should throw if request is not PENDING', async () => {
      requestRepo.findOne.mockResolvedValue({
        ...mockRequest,
        status: RequestStatus.IN_PROGRESS,
      });

      await expect(
        service.assign('req-uuid-1', { agentId: 'agent-uuid-1' }, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should assign agent and change status', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      requestRepo.save.mockResolvedValue({
        ...mockRequest,
        status: RequestStatus.ASSIGNED,
        assignedAgentId: 'agent-uuid-1',
      });
      logRepo.create.mockReturnValue({});
      logRepo.save.mockResolvedValue({});

      const result = await service.assign(
        'req-uuid-1',
        { agentId: 'agent-uuid-1' },
        'admin-id',
      );

      expect(result.status).toBe(RequestStatus.ASSIGNED);
      expect(result.assignedAgentId).toBe('agent-uuid-1');
      expect(emitter.emit).toHaveBeenCalledWith('request.assigned', expect.any(Object));
    });
  });
});
