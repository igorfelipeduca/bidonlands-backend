import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import z from 'zod';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CreateWalletOperationDto } from './dto/create-wallet-operation.dto';

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
  ) {
    return await this.walletsService.createWalletOperation(
      createWalletOperationDto,
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
