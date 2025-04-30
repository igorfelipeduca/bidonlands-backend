import {
  Controller,
  Post,
  Body,
  InternalServerErrorException,
} from '@nestjs/common';
import z, { prettifyError } from 'zod';
import { WebhookService } from './webhook.service';
import { StripePaymentCompletedDto } from './dto/stripe-payment-completed.dto';

@Controller('webhook')
export class AdvertsController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async create(
    @Body() stripeRequest: z.infer<typeof StripePaymentCompletedDto>,
  ) {
    return await this.webhookService.onPaymentLinkSucceed(stripeRequest);
  }
}
