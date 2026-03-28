import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl?: string;
  private readonly logger = new Logger(S3Service.name);
  private readonly allowedMimeTypes: string[];
  private readonly maxFileSizeBytes: number;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get<string>('s3.region') || 'ap-south-1',
      credentials: {
        accessKeyId: configService.get<string>('s3.accessKeyId') || '',
        secretAccessKey: configService.get<string>('s3.secretAccessKey') || '',
      },
    });
    this.bucket = configService.get<string>('s3.bucket') || 'sahayasetu-media';
    this.cdnUrl = configService.get<string>('s3.cdnUrl');
    this.allowedMimeTypes = configService.get<string[]>('s3.allowedMimeTypes') || [];
    this.maxFileSizeBytes =
      (configService.get<number>('s3.maxFileSizeMb') || 50) * 1024 * 1024;
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<{ key: string; url: string; size: number }> {
    // Validate
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} is not allowed`);
    }
    if (buffer.length > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSizeBytes / 1024 / 1024}MB`,
      );
    }

    const ext = path.extname(originalName);
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          originalName,
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    const url = this.cdnUrl
      ? `${this.cdnUrl}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    this.logger.log(`Uploaded ${key} (${buffer.length} bytes)`);
    return { key, url, size: buffer.length };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async getSignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
