import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { z } from 'zod';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthenticatedRequest } from 'src/guards/roles.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() data: z.infer<typeof CreateUserDto>) {
    return this.usersService.create(data);
  }

  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get('/find')
  async findOne(
    @Request() req,
    @Query('documents') documents: string,
  ) {
    return await this.usersService.findOne(req.url, documents);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: z.infer<typeof UpdateUserDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.update(+id, data, req.user.id);
  }

  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.usersService.remove(+id, req.user.id);
  }
}
