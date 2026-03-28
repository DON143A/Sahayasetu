import {
  IsString, IsEnum, IsOptional, IsNumber, Min, Max,
  MaxLength, MinLength, ValidateNested, IsArray, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  RequestCategory, RequestPriority, RequestStatus, GpsLocation,
} from '@sahayasetu/types';

export class GpsLocationDto implements GpsLocation {
  @ApiProperty({ example: 13.0827 })
  @IsNumber()
  @Min(-90) @Max(90)
  latitude: number;

  @ApiProperty({ example: 80.2707 })
  @IsNumber()
  @Min(-180) @Max(180)
  longitude: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  accuracy?: number;
}

export class CreateRequestDto {
  @ApiProperty({ example: 'Water pipe burst in my area' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'There is a major water pipe burst near the main road.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: RequestCategory })
  @IsEnum(RequestCategory)
  category: RequestCategory;

  @ApiPropertyOptional({ enum: RequestPriority })
  @IsEnum(RequestPriority)
  @IsOptional()
  priority?: RequestPriority;

  @ApiProperty()
  @ValidateNested()
  @Type(() => GpsLocationDto)
  location: GpsLocationDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  mediaIds?: string[];
}

export class UpdateRequestDto extends PartialType(CreateRequestDto) {}

export class UpdateStatusDto {
  @ApiProperty({ enum: RequestStatus })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class AssignRequestDto {
  @ApiProperty()
  @IsUUID()
  agentId: string;
}

export class FilterRequestsDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @ApiPropertyOptional({ enum: RequestPriority })
  @IsEnum(RequestPriority)
  @IsOptional()
  priority?: RequestPriority;

  @ApiPropertyOptional({ enum: RequestCategory })
  @IsEnum(RequestCategory)
  @IsOptional()
  category?: RequestCategory;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class RateRequestDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
