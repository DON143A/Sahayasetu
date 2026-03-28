import {
  Controller, Post, Get, Delete, Param, Body, Query,
  Req, UseGuards, UseInterceptors, UploadedFile,
  HttpCode, HttpStatus, BadRequestException, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../guards/auth.guard';
import { UserRole, MediaFieldType, GpsLocation } from '@sahayasetu/types';
import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class UploadQueryDto {
  @IsString()
  requestId: string;

  @IsEnum(MediaFieldType)
  fieldType: MediaFieldType;

  @IsNumber() @IsOptional() @Type(() => Number)
  latitude?: number;

  @IsNumber() @IsOptional() @Type(() => Number)
  longitude?: number;

  @IsString() @IsOptional()
  capturedAt?: string;

  @IsNumber() @IsOptional() @Type(() => Number)
  requestLat: number;

  @IsNumber() @IsOptional() @Type(() => Number)
  requestLng: number;

  @IsString() @IsOptional()
  requestCreatedAt?: string;
}

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a media file for a request' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Query() query: UploadQueryDto,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const gpsLocation: GpsLocation | undefined =
      query.latitude && query.longitude
        ? { latitude: query.latitude, longitude: query.longitude }
        : undefined;

    const requestLocation: GpsLocation = {
      latitude: query.requestLat,
      longitude: query.requestLng,
    };

    return this.mediaService.upload(file, {
      requestId: query.requestId,
      uploadedBy: req.user.id,
      fieldType: query.fieldType,
      requestLocation,
      requestCreatedAt: query.requestCreatedAt
        ? new Date(query.requestCreatedAt)
        : new Date(),
      gpsLocation,
      capturedAt: query.capturedAt ? new Date(query.capturedAt) : undefined,
    });
  }

  @Post('presigned')
  @ApiOperation({ summary: 'Get a presigned S3 URL for direct browser upload' })
  getPresignedUrl(
    @Body() body: { requestId: string; fieldType: MediaFieldType; mimeType: string },
  ) {
    return this.mediaService.generatePresignedUpload(
      body.requestId,
      body.fieldType,
      body.mimeType,
    );
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'List all media files for a request' })
  findByRequest(@Param('requestId') requestId: string) {
    return this.mediaService.findByRequest(requestId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single media metadata' })
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get a signed download URL for a media file' })
  getSignedUrl(@Param('id') id: string) {
    return this.mediaService.getSignedUrl(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media file' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.mediaService.delete(id, req.user.id);
  }

  @Get('admin/flagged')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List flagged/rejected media (admin only)' })
  getFlagged(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.mediaService.getFlaggedMedia(+page, +limit);
  }
}
