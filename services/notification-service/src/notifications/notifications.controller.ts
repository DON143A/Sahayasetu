import {
  Controller, Get, Patch, Param, Query,
  Req, UseGuards, HttpCode, HttpStatus, Post, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../guards/auth.guard';
import { NotificationType, NotificationChannel, UserRole } from '@sahayasetu/types';
import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';

class SendNotificationDto {
  @IsString() userId: string;
  @IsEnum(NotificationType) type: NotificationType;
  @IsObject() templateData: Record<string, unknown>;
  @IsString() @IsOptional() fcmToken?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() email?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  getMyNotifications(
    @Req() req: any,
    @Query('unread') unread?: string,
  ) {
    return this.service.getForUser(req.user.id, unread === 'true');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Req() req: any) {
    return this.service.markRead(req.user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markOneRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(req.user.id, id);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Trigger a notification manually (admin/internal)' })
  send(@Body() dto: SendNotificationDto) {
    return this.service.send({
      userId: dto.userId,
      type: dto.type,
      templateData: dto.templateData,
      fcmToken: dto.fcmToken,
      phone: dto.phone,
      email: dto.email,
    });
  }
}
