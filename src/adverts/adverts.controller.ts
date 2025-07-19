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
  async create(
    @Body() createAdvertDto: z.infer<typeof CreateAdvertDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.advertsService.create(createAdvertDto, req.user.id);
  }

  @Get()
  async findAll(
    @Query('page_size') page_size?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const size = page_size ? parseInt(page_size, 10) : 20;
    return await this.advertsService.findAll(size, status, search);
  }

  @Get('/find/:id')
  async findOne(@Param('id') id: string) {
    return await this.advertsService.findOne(+id);
  }

  @Get('/slug/:slug')
  async findOneBySlug(@Param('slug') slug: string) {
    return await this.advertsService.findOneBySlug(slug);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard)
  async seedAdverts(
    @Request() req: AuthenticatedRequest,
    @Query('qty') quantity: string,
  ) {
    return await this.advertsService.seedAdverts(req.user.id, +quantity);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAdvertDto: z.infer<typeof UpdateAdvertDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.advertsService.update(+id, updateAdvertDto, req.user.id);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.advertsService.remove(+id, req.user.id);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/end')
  async endAdvert(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.advertsService.endAdvert(+id);
  }

  @Get('featured')
  async getFeaturedAdvert() {
    return await this.advertsService.getFeaturedAdvert();
  }

  @Get('favorites/:userId')
  async getUserFavorites(@Param('userId') userId: string) {
    return await this.advertsService.getUserFavorites(+userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async likeAdvert(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.advertsService.likeAdvert(+id, req.user.id);
  }
}
