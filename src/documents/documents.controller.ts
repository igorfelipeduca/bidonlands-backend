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
  Query,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { z } from 'zod';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedRequest } from 'src/guards/roles.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createDocumentDto: z.infer<typeof CreateDocumentDto>,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.documentsService.create(
      createDocumentDto,
      file,
      req.user.id,
    );
  }

  @Get()
  async findAll() {
    return await this.documentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.documentsService.findOne(+id);
  }

  @Get(':id/approve')
  async approveDocument(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return await this.documentsService.approveOrDeny(+id, token, true);
  }

  @Get(':id/deny')
  async denyDocument(@Param('id') id: string, @Query('token') token: string) {
    return await this.documentsService.approveOrDeny(+id, token, false);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: z.infer<typeof UpdateDocumentDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.documentsService.update(
      +id,
      updateDocumentDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.documentsService.remove(+id, req.user.id);
  }
}
