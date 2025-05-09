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
  Query,
} from '@nestjs/common';
import { AdvertsService } from './adverts.service';
import { CreateAdvertDto } from './dto/create-advert.dto';
import { UpdateAdvertDto } from './dto/update-advert.dto';
import z from 'zod';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuthenticatedRequest, RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('adverts')
export class AdvertsController {
  constructor(private readonly advertsService: AdvertsService) {}

  @Post()
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  create(
    @Body() createAdvertDto: z.infer<typeof CreateAdvertDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.advertsService.create(createAdvertDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('page_size') page_size?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const size = page_size ? parseInt(page_size, 10) : 20;
    return this.advertsService.findAll(size, status, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advertsService.findOne(+id);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard)
  seedAdverts(
    @Request() req: AuthenticatedRequest,
    @Query('qty') quantity: string,
  ) {
    return this.advertsService.seedAdverts(req.user.id, +quantity);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAdvertDto: z.infer<typeof UpdateAdvertDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.advertsService.update(+id, updateAdvertDto, req.user.id);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.advertsService.remove(+id, req.user.id);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/end')
  endAdvert(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.advertsService.endAdvert(+id);
  }
}
