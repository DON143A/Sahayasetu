import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HelpRequest } from './entities/request.entity';
import { RequestLog } from './entities/request-log.entity';
import {
  CreateRequestDto, UpdateStatusDto, FilterRequestsDto,
  AssignRequestDto, RateRequestDto,
} from './dto/request.dto';
import {
  RequestStatus, RequestPriority, UserRole, PaginatedResponse,
} from '@sahayasetu/types';
import {
  generateRequestNumber, buildPaginationMeta, paginationDefaults,
} from '@sahayasetu/utils';

// Valid status transitions
const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PENDING]: [RequestStatus.ASSIGNED, RequestStatus.REJECTED],
  [RequestStatus.ASSIGNED]: [RequestStatus.IN_PROGRESS, RequestStatus.REJECTED],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.COMPLETED, RequestStatus.REJECTED],
  [RequestStatus.COMPLETED]: [],
  [RequestStatus.REJECTED]: [],
};

// Auto-priority keywords
const CRITICAL_KEYWORDS = ['emergency', 'urgent', 'fire', 'flood', 'accident', 'death'];
const HIGH_KEYWORDS = ['broken', 'leak', 'power', 'gas', 'injury'];

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectRepository(HelpRequest)
    private readonly requestRepo: Repository<HelpRequest>,
    @InjectRepository(RequestLog)
    private readonly logRepo: Repository<RequestLog>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(
    userId: string,
    dto: CreateRequestDto,
  ): Promise<HelpRequest> {
    const priority = dto.priority ?? this.detectPriority(dto.title, dto.description);

    const request = this.requestRepo.create({
      ...dto,
      userId,
      priority,
      requestNumber: generateRequestNumber(),
      status: RequestStatus.PENDING,
    });

    await this.requestRepo.save(request);
    await this.addLog(request.id, 'REQUEST_CREATED', null, RequestStatus.PENDING, userId);

    this.eventEmitter.emit('request.created', request);
    this.logger.log(`Request ${request.requestNumber} created by ${userId}`);

    return request;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(
    filters: FilterRequestsDto,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<PaginatedResponse<HelpRequest>> {
    const { page, limit, skip } = paginationDefaults(filters.page, filters.limit);

    const where: FindManyOptions<HelpRequest>['where'] = {};

    // Users can only see their own requests
    if (requestingUserRole === UserRole.USER) {
      Object.assign(where, { userId: requestingUserId });
    }
    // Field agents see only assigned requests
    if (requestingUserRole === UserRole.FIELD_AGENT) {
      Object.assign(where, { assignedAgentId: requestingUserId });
    }

    if (filters.status) Object.assign(where, { status: filters.status });
    if (filters.priority) Object.assign(where, { priority: filters.priority });
    if (filters.category) Object.assign(where, { category: filters.category });

    const [data, total] = await this.requestRepo.findAndCount({
      where: filters.search
        ? [
            { ...where, title: ILike(`%${filters.search}%`) },
            { ...where, description: ILike(`%${filters.search}%`) },
          ]
        : where,
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, requestingUserId: string, role: UserRole): Promise<HelpRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['logs'],
    });

    if (!request) throw new NotFoundException(`Request ${id} not found`);

    if (
      role === UserRole.USER && request.userId !== requestingUserId ||
      role === UserRole.FIELD_AGENT && request.assignedAgentId !== requestingUserId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return request;
  }

  async findByNumber(requestNumber: string): Promise<HelpRequest> {
    const request = await this.requestRepo.findOne({ where: { requestNumber } });
    if (!request) throw new NotFoundException(`Request ${requestNumber} not found`);
    return request;
  }

  // ── Status Machine ────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    performedBy: string,
    role: UserRole,
  ): Promise<HelpRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    // Validate transition
    const allowed = STATUS_TRANSITIONS[request.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${request.status} to ${dto.status}`,
      );
    }

    // Permission checks
    if (role === UserRole.USER && dto.status !== RequestStatus.REJECTED) {
      throw new ForbiddenException('Users cannot update request status');
    }
    if (
      role === UserRole.FIELD_AGENT &&
      request.assignedAgentId !== performedBy
    ) {
      throw new ForbiddenException('Not your assigned request');
    }

    const fromStatus = request.status;
    request.status = dto.status;

    if (dto.status === RequestStatus.COMPLETED) request.completedAt = new Date();
    if (dto.rejectionReason) request.rejectionReason = dto.rejectionReason;

    await this.requestRepo.save(request);
    await this.addLog(id, `STATUS_${dto.status}`, fromStatus, dto.status, performedBy, dto.note);

    this.eventEmitter.emit('request.statusChanged', { request, fromStatus, dto });
    return request;
  }

  async assign(
    id: string,
    dto: AssignRequestDto,
    adminId: string,
  ): Promise<HelpRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be assigned');
    }

    const fromStatus = request.status;
    request.assignedAgentId = dto.agentId;
    request.status = RequestStatus.ASSIGNED;
    request.assignedAt = new Date();

    await this.requestRepo.save(request);
    await this.addLog(
      id, 'REQUEST_ASSIGNED', fromStatus, RequestStatus.ASSIGNED, adminId,
      `Assigned to agent ${dto.agentId}`,
    );

    this.eventEmitter.emit('request.assigned', { request, agentId: dto.agentId });
    return request;
  }

  // ── Rating ────────────────────────────────────────────────────────────────

  async rate(
    id: string,
    dto: RateRequestDto,
    userId: string,
  ): Promise<HelpRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.userId !== userId) throw new ForbiddenException('Not your request');
    if (request.status !== RequestStatus.COMPLETED)
      throw new BadRequestException('Can only rate completed requests');
    if (request.rating) throw new BadRequestException('Already rated');

    request.rating = dto.rating;
    request.ratingComment = dto.comment;
    await this.requestRepo.save(request);

    this.eventEmitter.emit('request.rated', { request, rating: dto.rating });
    return request;
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getStats(agentId?: string) {
    const qb = this.requestRepo.createQueryBuilder('r');
    if (agentId) qb.where('r.assignedAgentId = :agentId', { agentId });

    const [total, pending, inProgress, completed, rejected] = await Promise.all([
      qb.getCount(),
      this.requestRepo.count({ where: agentId ? { assignedAgentId: agentId, status: RequestStatus.PENDING } : { status: RequestStatus.PENDING } }),
      this.requestRepo.count({ where: agentId ? { assignedAgentId: agentId, status: RequestStatus.IN_PROGRESS } : { status: RequestStatus.IN_PROGRESS } }),
      this.requestRepo.count({ where: agentId ? { assignedAgentId: agentId, status: RequestStatus.COMPLETED } : { status: RequestStatus.COMPLETED } }),
      this.requestRepo.count({ where: agentId ? { assignedAgentId: agentId, status: RequestStatus.REJECTED } : { status: RequestStatus.REJECTED } }),
    ]);

    return { total, pending, inProgress, completed, rejected };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private detectPriority(title: string, description: string): RequestPriority {
    const text = `${title} ${description}`.toLowerCase();
    if (CRITICAL_KEYWORDS.some((k) => text.includes(k))) return RequestPriority.CRITICAL;
    if (HIGH_KEYWORDS.some((k) => text.includes(k))) return RequestPriority.HIGH;
    return RequestPriority.MEDIUM;
  }

  private async addLog(
    requestId: string,
    action: string,
    fromStatus: RequestStatus | null,
    toStatus: RequestStatus,
    performedBy: string,
    note?: string,
  ): Promise<void> {
    await this.logRepo.save(
      this.logRepo.create({ requestId, action, fromStatus, toStatus, performedBy, note }),
    );
  }
}
