import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { z } from 'zod';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedRequest } from 'src/guards/roles.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createAttachmentDto: z.infer<typeof CreateAttachmentDto>,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.attachmentsService.create(
      createAttachmentDto,
      file,
      req.user.id,
    );
  }

  @Get()
  async findAll() {
    return await this.attachmentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.attachmentsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateAttachmentDto: z.infer<typeof UpdateAttachmentDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.attachmentsService.update(
      +id,
      updateAttachmentDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.attachmentsService.remove(+id, req.user.id);
  }
}
