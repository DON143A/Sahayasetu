import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MediaType, MediaFieldType, VerificationStatus, GpsLocation } from '@sahayasetu/types';

export type MediaFileDocument = MediaFile & Document;

@Schema({ timestamps: true, collection: 'media_files' })
export class MediaFile {
  @Prop({ required: true, index: true })
  requestId: string;

  @Prop({ required: true })
  uploadedBy: string;

  @Prop({ required: true, enum: Object.values(MediaFieldType) })
  fieldType: MediaFieldType;

  @Prop({ required: true, enum: Object.values(MediaType) })
  mediaType: MediaType;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true })
  s3Url: string;

  @Prop({ type: Object, default: null })
  gpsLocation: GpsLocation | null;

  @Prop({ default: null })
  capturedAt: Date | null;

  @Prop({
    required: true,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.PENDING,
    index: true,
  })
  verificationStatus: VerificationStatus;

  @Prop({ default: null })
  verificationNote: string | null;

  @Prop({ default: 0 })
  fraudScore: number;

  @Prop({ type: [String], default: [] })
  fraudFlags: string[];

  @Prop({ default: null })
  checkedAt: Date | null;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);
MediaFileSchema.index({ requestId: 1, fieldType: 1 });
MediaFileSchema.index({ verificationStatus: 1, createdAt: -1 });
