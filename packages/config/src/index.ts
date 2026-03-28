import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'sahayasetu',
    password: process.env.POSTGRES_PASSWORD || 'secret',
    database: process.env.POSTGRES_DB || 'sahayasetu',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sahayasetu',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    ttl: 3600,
  },
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'sahayasetu-super-secret-key-change-in-prod',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  otpExpiry: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
}));

export const s3Config = registerAs('s3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'ap-south-1',
  bucket: process.env.AWS_S3_BUCKET || 'sahayasetu-media',
  cdnUrl: process.env.CDN_URL,
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50'),
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf',
  ],
}));

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000'),
  environment: process.env.NODE_ENV || 'development',
  apiPrefix: 'api/v1',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
}));

export const serviceConfig = registerAs('services', () => ({
  authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  requestService: process.env.REQUEST_SERVICE_URL || 'http://localhost:3002',
  mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3003',
  notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  verificationService: process.env.VERIFICATION_SERVICE_URL || 'http://localhost:3005',
}));
