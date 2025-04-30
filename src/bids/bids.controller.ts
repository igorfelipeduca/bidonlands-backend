import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import z from 'zod';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuthenticatedRequest } from 'src/guards/roles.guard';
import { CreateBidIntentDto } from './dto/create-bid-intent.dto';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createBidDto: z.infer<typeof CreateBidDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bidsService.create(createBidDto, req.user.id);
  }

  @Post('/intents')
  @UseGuards(JwtAuthGuard)
  async createBidIntent(
    @Body() createBidIntent: z.infer<typeof CreateBidIntentDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.bidsService.createBidIntent(createBidIntent, req.user.id);
  }

  @Get('/intents')
  @UseGuards(JwtAuthGuard)
  async listUserBidIntents(@Request() req: AuthenticatedRequest) {
    return await this.bidsService.findUsersBidIntents(req.user.id);
  }

  @Get()
  findAll() {
    return this.bidsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bidsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateBidDto: z.infer<typeof UpdateBidDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bidsService.update(+id, updateBidDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bidsService.remove(+id);
  }
}
