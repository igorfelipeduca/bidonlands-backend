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
import { WalletsService } from './wallets.service';
import z from 'zod';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuthenticatedRequest, RolesGuard } from 'src/guards/roles.guard';
import { DocumentsGuard } from 'src/guards/documents.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CreateWalletOperationDto } from './dto/create-wallet-operation.dto';
import {
  ManageWithdrawalRequestDto,
  RequestWithdrawalDto,
} from './dto/request-withdrawal.dto';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  async create(@Body() createWalletDto: z.infer<typeof CreateWalletDto>) {
    return await this.walletsService.create(createWalletDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('operation')
  async createWalletOperation(
    @Body() createWalletOperationDto: z.infer<typeof CreateWalletOperationDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.walletsService.createWalletOperation(
      createWalletOperationDto,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, DocumentsGuard)
  @Roles(Role.Admin)
  @Post('deposit')
  async createDepositPaymentLink(
    @Body() createWalletOperationDto: z.infer<typeof CreateWalletOperationDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.walletsService.createDepositPaymentLink(
      createWalletOperationDto.amount,
      req.user.id,
      req.body.origin,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('withdrawal')
  async requestWithdrawal(
    @Body() requestWithdrawalDto: z.infer<typeof RequestWithdrawalDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.walletsService.requestWithdrawal(
      requestWithdrawalDto,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('withdrawal/:id/manage')
  async manageWithdrawalRequest(
    @Body()
    manageWithdrawalRequestDto: z.infer<typeof ManageWithdrawalRequestDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.walletsService.manageWithdrawalRequest(
      +req.params.id,
      manageWithdrawalRequestDto.status,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  async findAll() {
    return await this.walletsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.walletsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWalletDto: z.infer<typeof UpdateWalletDto>,
  ) {
    return await this.walletsService.update(+id, updateWalletDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.walletsService.remove(+id);
  }
}
