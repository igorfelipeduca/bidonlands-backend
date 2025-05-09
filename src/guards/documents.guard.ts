import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';
import { DocumentType } from 'src/drizzle/schema/documents.schema';

export interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@Injectable()
export class DocumentsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(UsersService)
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    if (!user.roles || !Array.isArray(user.roles)) {
      throw new UnauthorizedException('User roles not found in request');
    }

    const dbUserAndDocuments = await this.usersService.findUserWithDocuments(
      user.id,
    );

    if (!dbUserAndDocuments || !dbUserAndDocuments.length) {
      throw new UnauthorizedException('User not found in database');
    }

    const documents = dbUserAndDocuments
      .filter((row) => row.documents)
      .map((row) => row.documents as DocumentType);

    if (!documents || !documents.length) {
      throw new UnauthorizedException(
        'To perform this action, please submit a Photo ID and wait until it is approved by our staff.',
      );
    }

    const hasApprovedPhotoId = documents.some(
      (d) => d.type === '2' && d.isApproved === true,
    );

    if (!hasApprovedPhotoId) {
      throw new UnauthorizedException(
        'To perform this action, please submit a Photo ID and wait until it is approved by our staff.',
      );
    }

    return true;
  }
}
