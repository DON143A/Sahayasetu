import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MediaFile, MediaFileDocument } from './entities/media.entity';
import { S3Service } from '../storage/s3.service';
import { VerificationService } from '../verification/verification.service';
import { MediaType, MediaFieldType, GpsLocation, VerificationStatus } from '@sahayasetu/types';

export interface UploadMediaDto {
  requestId: string;
  uploadedBy: string;
  fieldType: MediaFieldType;
  requestLocation: GpsLocation;
  requestCreatedAt: Date;
  gpsLocation?: GpsLocation;
  capturedAt?: Date;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(MediaFile.name)
    private readonly mediaModel: Model<MediaFileDocument>,
    private readonly s3Service: S3Service,
    private readonly verificationService: VerificationService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadMediaDto,
  ): Promise<MediaFileDocument> {
    // Determine media type from mime
    const mediaType = this.resolveMediaType(file.mimetype);

    // Upload to S3
    const folder = `requests/${dto.requestId}/${dto.fieldType.toLowerCase()}`;
    const { key, url, size } = await this.s3Service.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
    );

    // Run verification
    const verification = await this.verificationService.verifyMedia({
      mediaLocation: dto.gpsLocation,
      requestLocation: dto.requestLocation,
      capturedAt: dto.capturedAt,
      requestCreatedAt: dto.requestCreatedAt,
      fileSize: size,
      mimeType: file.mimetype,
    });

    // Persist metadata in MongoDB
    const media = await this.mediaModel.create({
      requestId: dto.requestId,
      uploadedBy: dto.uploadedBy,
      fieldType: dto.fieldType,
      mediaType,
      fileName: file.originalname,
      fileSize: size,
      mimeType: file.mimetype,
      s3Key: key,
      s3Url: url,
      gpsLocation: dto.gpsLocation ?? null,
      capturedAt: dto.capturedAt ?? null,
      verificationStatus: verification.status,
      verificationNote: verification.flags.join(', ') || null,
      fraudScore: verification.fraudScore,
      fraudFlags: verification.flags,
      checkedAt: new Date(),
    });

    this.logger.log(
      `Media ${media._id} uploaded for request ${dto.requestId} — status: ${verification.status}`,
    );
    return media;
  }

  async findByRequest(requestId: string): Promise<MediaFileDocument[]> {
    return this.mediaModel
      .find({ requestId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<MediaFileDocument[]>;
  }

  async findOne(id: string): Promise<MediaFileDocument> {
    const media = await this.mediaModel.findById(id).exec();
    if (!media) throw new NotFoundException(`Media ${id} not found`);
    return media;
  }

  async getSignedUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    const media = await this.findOne(id);
    const url = await this.s3Service.getSignedDownloadUrl(media.s3Key, 3600);
    return { url, expiresIn: 3600 };
  }

  async generatePresignedUpload(
    requestId: string,
    fieldType: MediaFieldType,
    mimeType: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const key = `requests/${requestId}/${fieldType.toLowerCase()}/${Date.now()}.${mimeType.split('/')[1]}`;
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, mimeType, 300);
    return { uploadUrl, key };
  }

  async delete(id: string, userId: string): Promise<void> {
    const media = await this.findOne(id);
    if (media.uploadedBy !== userId) {
      throw new BadRequestException('Cannot delete media uploaded by another user');
    }
    await this.s3Service.delete(media.s3Key);
    await this.mediaModel.findByIdAndDelete(id).exec();
  }

  async getFlaggedMedia(page = 1, limit = 20): Promise<MediaFileDocument[]> {
    return this.mediaModel
      .find({ verificationStatus: { $in: [VerificationStatus.FLAGGED, VerificationStatus.REJECTED] } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async reVerify(id: string, requestLocation: GpsLocation, requestCreatedAt: Date) {
    const media = await this.findOne(id);
    const verification = await this.verificationService.verifyMedia({
      mediaLocation: media.gpsLocation ?? undefined,
      requestLocation,
      capturedAt: media.capturedAt ?? undefined,
      requestCreatedAt,
      fileSize: media.fileSize,
      mimeType: media.mimeType,
    });

    return this.mediaModel.findByIdAndUpdate(
      id,
      {
        verificationStatus: verification.status,
        fraudScore: verification.fraudScore,
        fraudFlags: verification.flags,
        verificationNote: verification.flags.join(', ') || null,
        checkedAt: new Date(),
      },
      { new: true },
    ).exec();
  }

  private resolveMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    return MediaType.DOCUMENT;
  }
}
