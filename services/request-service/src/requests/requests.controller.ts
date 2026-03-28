import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import {
  CreateRequestDto, UpdateStatusDto, FilterRequestsDto,
  AssignRequestDto, RateRequestDto,
} from './dto/request.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../guards/auth.guard';
import { UserRole } from '@sahayasetu/types';

@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new help request' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRequestDto, @Req() req: any) {
    return this.requestsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List requests (filtered by role)' })
  findAll(@Query() filters: FilterRequestsDto, @Req() req: any) {
    return this.requestsService.findAll(filters, req.user.id, req.user.role);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get request statistics' })
  getStats(@Req() req: any) {
    const agentId = req.user.role === UserRole.FIELD_AGENT ? req.user.id : undefined;
    return this.requestsService.getStats(agentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single request by ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.requestsService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update request status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: any,
  ) {
    return this.requestsService.updateStatus(id, dto, req.user.id, req.user.role);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign request to field agent (admin only)' })
  assign(@Param('id') id: string, @Body() dto: AssignRequestDto, @Req() req: any) {
    return this.requestsService.assign(id, dto, req.user.id);
  }

  @Post(':id/rate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Rate a completed request' })
  rate(@Param('id') id: string, @Body() dto: RateRequestDto, @Req() req: any) {
    return this.requestsService.rate(id, dto, req.user.id);
  }
}
