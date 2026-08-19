import { Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { GithubWebhooksQueue } from './github-webhooks.queue';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks/github')
export class GithubWebhooksController {
  constructor(private readonly queue: GithubWebhooksQueue) {}

  @Post()
  @HttpCode(200)
  async receive(@Req() request: RawBodyRequest) {
    const signature = request.header('x-hub-signature-256');
    const deliveryId = request.header('x-github-delivery');
    const event = request.header('x-github-event');
    const rawBody = request.rawBody;

    if (!signature || !deliveryId || !event || !rawBody || !this.hasValidSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid GitHub webhook signature');
    }

    await this.queue.enqueue({ deliveryId, event, rawPayload: rawBody.toString('utf8') });
    return { received: true };
  }

  private hasValidSignature(rawBody: Buffer, signature: string) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret || !signature.startsWith('sha256=')) return false;

    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const received = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  }
}
