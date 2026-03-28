import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType, NotificationChannel } from '@sahayasetu/types';

// ── Notification Document ──────────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'notifications' })
class NotificationDoc {
  @Prop({ required: true, index: true }) userId: string;
  @Prop({ required: true, enum: Object.values(NotificationType) }) type: string;
  @Prop({ required: true, enum: Object.values(NotificationChannel) }) channel: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) body: string;
  @Prop({ type: Object, default: null }) data: Record<string, unknown> | null;
  @Prop({ default: false }) read: boolean;
  @Prop({ default: null }) sentAt: Date | null;
}
const NotificationSchema = SchemaFactory.createForClass(NotificationDoc);

// ── Push Service ──────────────────────────────────────────────────────────

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    try {
      // Firebase Admin SDK integration
      const admin = require('firebase-admin');
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      this.logger.log(`Push sent to token: ${fcmToken.slice(0, 10)}...`);
      return true;
    } catch (err) {
      this.logger.error(`Push failed: ${err.message}`);
      return false;
    }
  }
}

// ── SMS Service ───────────────────────────────────────────────────────────

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(phone: string, message: string): Promise<boolean> {
    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      this.logger.log(`SMS sent to ${phone}`);
      return true;
    } catch (err) {
      this.logger.error(`SMS failed: ${err.message}`);
      return false;
    }
  }
}

// ── Email Service ─────────────────────────────────────────────────────────

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: `"SahayaSetu" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Email failed: ${err.message}`);
      return false;
    }
  }
}

// ── Notification Templates ────────────────────────────────────────────────

const TEMPLATES: Record<NotificationType, (data: any) => { title: string; body: string }> = {
  [NotificationType.REQUEST_CREATED]: (d) => ({
    title: 'Request Submitted',
    body: `Your request #${d.requestNumber} has been submitted successfully.`,
  }),
  [NotificationType.REQUEST_ASSIGNED]: (d) => ({
    title: 'Agent Assigned',
    body: `A field agent has been assigned to your request #${d.requestNumber}.`,
  }),
  [NotificationType.REQUEST_UPDATED]: (d) => ({
    title: 'Request Updated',
    body: `Your request #${d.requestNumber} status changed to ${d.status}.`,
  }),
  [NotificationType.REQUEST_COMPLETED]: (d) => ({
    title: 'Request Completed',
    body: `Request #${d.requestNumber} has been resolved. Please rate your experience.`,
  }),
  [NotificationType.AGENT_NEARBY]: (d) => ({
    title: 'Agent Nearby',
    body: `Your field agent is ${d.distanceKm}km away and heading to your location.`,
  }),
  [NotificationType.CHAT_MESSAGE]: (d) => ({
    title: `New message from ${d.senderName}`,
    body: d.preview,
  }),
};

// ── Main Notification Service ─────────────────────────────────────────────

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel('Notification') private readonly notifModel: Model<Document>,
    private readonly pushService: PushService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  async send(params: {
    userId: string;
    type: NotificationType;
    templateData: Record<string, unknown>;
    fcmToken?: string;
    phone?: string;
    email?: string;
    channels?: NotificationChannel[];
  }): Promise<void> {
    const template = TEMPLATES[params.type](params.templateData);
    const channels = params.channels ?? [NotificationChannel.PUSH, NotificationChannel.IN_APP];

    for (const channel of channels) {
      try {
        let sentAt: Date | null = null;

        if (channel === NotificationChannel.PUSH && params.fcmToken) {
          const ok = await this.pushService.send(
            params.fcmToken,
            template.title,
            template.body,
            params.templateData as Record<string, string>,
          );
          if (ok) sentAt = new Date();
        }

        if (channel === NotificationChannel.SMS && params.phone) {
          const ok = await this.smsService.send(
            params.phone,
            `${template.title}: ${template.body}`,
          );
          if (ok) sentAt = new Date();
        }

        if (channel === NotificationChannel.EMAIL && params.email) {
          const ok = await this.emailService.send(
            params.email,
            template.title,
            `<p>${template.body}</p>`,
          );
          if (ok) sentAt = new Date();
        }

        // Always save IN_APP notification
        await this.notifModel.create({
          userId: params.userId,
          type: params.type,
          channel,
          title: template.title,
          body: template.body,
          data: params.templateData,
          read: false,
          sentAt,
        });
      } catch (err) {
        this.logger.error(`Notification channel ${channel} failed: ${err.message}`);
      }
    }
  }

  async getForUser(userId: string, unreadOnly = false): Promise<Document[]> {
    const query = unreadOnly ? { userId, read: false } : { userId };
    return this.notifModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async markRead(userId: string, notifId?: string): Promise<void> {
    const query = notifId ? { _id: notifId, userId } : { userId, read: false };
    await this.notifModel.updateMany(query, { read: true }).exec();
  }
}
