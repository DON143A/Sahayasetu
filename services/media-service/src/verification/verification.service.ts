import { Injectable, Logger } from '@nestjs/common';
import { isWithinRadius } from '@sahayasetu/utils';
import { GpsLocation, VerificationStatus } from '@sahayasetu/types';

export interface VerificationReport {
  status: VerificationStatus;
  gpsMatch: boolean;
  timestampValid: boolean;
  fraudScore: number;
  flags: string[];
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly GPS_TOLERANCE_KM = 0.5; // 500 meters
  private readonly MAX_TIMESTAMP_DIFF_MINUTES = 30;

  async verifyMedia(params: {
    mediaLocation?: GpsLocation;
    requestLocation: GpsLocation;
    capturedAt?: Date;
    requestCreatedAt: Date;
    fileSize: number;
    mimeType: string;
  }): Promise<VerificationReport> {
    const flags: string[] = [];
    let fraudScore = 0;

    // GPS check
    const gpsMatch = this.checkGps(params.mediaLocation, params.requestLocation, flags);
    if (!gpsMatch) fraudScore += 40;

    // Timestamp check
    const timestampValid = this.checkTimestamp(
      params.capturedAt,
      params.requestCreatedAt,
      flags,
    );
    if (!timestampValid) fraudScore += 30;

    // File integrity checks
    this.checkFileIntegrity(params.fileSize, params.mimeType, flags, fraudScore);

    // Determine final status
    let status: VerificationStatus;
    if (fraudScore >= 70) status = VerificationStatus.FLAGGED;
    else if (fraudScore >= 40) status = VerificationStatus.REJECTED;
    else status = VerificationStatus.VERIFIED;

    this.logger.log(
      `Verification complete: score=${fraudScore}, status=${status}, flags=${flags.join(', ')}`,
    );

    return { status, gpsMatch, timestampValid, fraudScore, flags };
  }

  private checkGps(
    mediaLocation: GpsLocation | undefined,
    requestLocation: GpsLocation,
    flags: string[],
  ): boolean {
    if (!mediaLocation) {
      flags.push('NO_GPS_DATA');
      return false;
    }

    const within = isWithinRadius(
      mediaLocation.latitude,
      mediaLocation.longitude,
      requestLocation.latitude,
      requestLocation.longitude,
      this.GPS_TOLERANCE_KM,
    );

    if (!within) flags.push('GPS_MISMATCH');
    return within;
  }

  private checkTimestamp(
    capturedAt: Date | undefined,
    requestCreatedAt: Date,
    flags: string[],
  ): boolean {
    if (!capturedAt) {
      flags.push('NO_TIMESTAMP');
      return false;
    }

    const diffMs = Math.abs(capturedAt.getTime() - requestCreatedAt.getTime());
    const diffMinutes = diffMs / 60000;

    // Media should be captured around the time of the request
    if (capturedAt < requestCreatedAt) {
      // Allow up to 24h before (pre-existing evidence)
      if (diffMinutes > 24 * 60) {
        flags.push('TIMESTAMP_TOO_OLD');
        return false;
      }
    } else {
      // Must be captured within 30 minutes after request
      if (diffMinutes > this.MAX_TIMESTAMP_DIFF_MINUTES) {
        flags.push('TIMESTAMP_TOO_LATE');
        return false;
      }
    }

    return true;
  }

  private checkFileIntegrity(
    fileSize: number,
    mimeType: string,
    flags: string[],
    fraudScore: number,
  ): void {
    // Suspicious: image file too small (possibly a blank/corrupt image)
    if (mimeType.startsWith('image/') && fileSize < 5 * 1024) {
      flags.push('FILE_TOO_SMALL');
      fraudScore += 20;
    }

    // Suspicious: video file too small
    if (mimeType.startsWith('video/') && fileSize < 50 * 1024) {
      flags.push('VIDEO_TOO_SMALL');
      fraudScore += 25;
    }
  }
}
