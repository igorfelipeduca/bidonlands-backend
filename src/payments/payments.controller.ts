import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import z from 'zod';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() createPaymentDto: z.infer<typeof CreatePaymentDto>) {
    return await this.paymentsService.create(createPaymentDto);
  }

  @Get()
  async findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: z.infer<typeof UpdatePaymentDto>,
  ) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
