import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { z } from 'zod';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../drizzle/schema/index';
import { attachmentsTable } from 'src/drizzle/schema/attachments.schema';
import * as dotenv from 'dotenv';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import { UsersService } from 'src/users/users.service';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';
import { ATTACHMENT_EXTENSIONS } from 'src/drizzle/schema/enums/attachment.enum';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS,
  },
});

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(UsersService)
    private usersService: UsersService,
  ) {}

  async create(
    body: z.infer<typeof CreateAttachmentDto>,
    file: Express.Multer.File,
    userId: number,
  ) {
    const { data, error } = CreateAttachmentDto.safeParse(body);

    const parsedFileName = file.originalname.split('.');
    const extension = parsedFileName[parsedFileName.length - 1].toLowerCase();
    const cleanFileName = parsedFileName
      .slice(0, -1)
      .join('.')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    const dbFileName = `bldoc-${cleanFileName}-${Date.now()}.${extension}`;

    const allowedExtensions = Object.values(ATTACHMENT_EXTENSIONS).map((ext) =>
      ext.toLowerCase(),
    );

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException('Invalid or unsupported file extension');
    }

    if (error) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser.length) throw new NotFoundException('User does not exist');

    if (data.type === '1' && !data.advertId) {
      throw new BadRequestException('Advert id is required');
    }

    if (!dbUser[0] || !dbUser[0].emailVerified) {
      const availableEmail = await this.db
        .select()
        .from(emailTokenTable)
        .where(eq(emailTokenTable.userId, userId));

      const sendVerificationEmail = async () => {
        await this.usersService.sendVerificationEmail(
          dbUser[0]?.email,
          dbUser[0]?.firstName,
        );

        throw new UnauthorizedException(
          "Almost there! To add an attachment, please verify your email address. We've just sent you a verification email - be sure to check your inbox and spam folder. Thanks for helping us keep your account secure!",
        );
      };

      if (!availableEmail[0]) {
        await sendVerificationEmail();
      } else {
        const sentMinutesAgo = Math.floor(
          (Date.now() - availableEmail[0].createdAt.getTime()) / (1000 * 60),
        );

        if (sentMinutesAgo < 10) {
          throw new UnauthorizedException(
            `Heads up! You'll need to verify your email before adding an attachment. We sent you a verification email ${sentMinutesAgo} minute${sentMinutesAgo === 1 ? '' : 's'} ago-please check your inbox and spam folder. Thanks for your patience!`,
          );
        } else {
          await sendVerificationEmail();
        }
      }
    } else {
      try {
        const uploadConfig = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: dbFileName,
          Body: file.buffer,
          region: process.env.AWS_REGION,
        };

        await s3Client.send(new PutObjectCommand(uploadConfig));

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${dbFileName}`;

        const insertData = {
          name: file.originalname,
          extension: parsedFileName[1],
          size: file.size,
          url: fileUrl,
          key: dbFileName,
          type: data.type,
          tags: data.tags,
          userId,
        } as InferInsertModel<typeof attachmentsTable>;

        const newDbAttachment = await this.db
          .insert(attachmentsTable)
          .values(insertData)
          .returning();

        return newDbAttachment;
      } catch (err) {
        throw new BadRequestException(
          `Failed to upload file to S3: ${err.message}`,
        );
      }
    }
  }

  async findAll() {
    return await this.db.select().from(attachmentsTable);
  }

  async findOne(id: number) {
    return await this.db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, id));
  }

  async update(
    id: number,
    updateAttachmentDto: z.infer<typeof UpdateAttachmentDto>,
    userId: number,
  ) {
    const dbUser = await this.db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.userId, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbAttachment = await this.db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, id));

    if (!dbAttachment.length)
      throw new NotFoundException('Attachment not found');
    if (dbAttachment[0].userId !== userId)
      throw new UnauthorizedException('You can only edit your attachments');

    return await this.db
      .update(attachmentsTable)
      .set(updateAttachmentDto as InferInsertModel<typeof attachmentsTable>)
      .where(eq(attachmentsTable.id, id))
      .returning();
  }

  async remove(id: number, userId: number) {
    const dbUser = await this.db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.userId, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbAttachment = await this.db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, id));

    if (!dbAttachment.length)
      throw new NotFoundException('Attachment not found');
    if (dbAttachment[0].userId !== userId)
      throw new UnauthorizedException(
        'You can only delete your own attachments',
      );

    return await this.db
      .delete(attachmentsTable)
      .where(eq(attachmentsTable.id, id));
  }
}
