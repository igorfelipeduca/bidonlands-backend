import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { Infer, z } from 'zod';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../drizzle/schema/index';
import { documentsTable } from 'src/drizzle/schema/documents.schema';
import * as dotenv from 'dotenv';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import { UsersService } from 'src/users/users.service';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';
import { DOCUMENT_EXTENSIONS } from 'src/drizzle/schema/enums/document.enum';
import { EmailService } from 'src/email/email.service';
import { JwtService } from '@nestjs/jwt';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS,
  },
});

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(UsersService)
    private usersService: UsersService,
    @Inject(EmailService)
    private emailsService: EmailService,
    @Inject(JwtService)
    private jwtService: JwtService,
  ) {}

  async create(
    body: z.infer<typeof CreateDocumentDto>,
    file: Express.Multer.File,
    userId: number,
  ) {
    const { data, error } = CreateDocumentDto.safeParse(body);

    const parsedFileName = file.originalname.split('.');
    const extension = parsedFileName[parsedFileName.length - 1].toLowerCase();
    const cleanFileName = parsedFileName
      .slice(0, -1)
      .join('.')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    const dbFileName = `bldoc-${cleanFileName}-${Date.now()}.${extension}`;

    const allowedExtensions = Object.values(DOCUMENT_EXTENSIONS).map((ext) =>
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

    if (data.type === '2' && data.advertId) {
      throw new BadRequestException(
        'You can not link personal documents to adverts.',
      );
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
          "Almost there! To add a document, please verify your email address. We've just sent you a verification email - be sure to check your inbox and spam folder. Thanks for helping us keep your account secure!",
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
            `Heads up! You'll need to verify your email before adding an document. We sent you a verification email ${sentMinutesAgo} minute${sentMinutesAgo === 1 ? '' : 's'} ago-please check your inbox and spam folder. Thanks for your patience!`,
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
          isApproved: data.type === '1' ? true : false,
          userId,
          advertId: data.type === '1' ? data.advertId : undefined,
        } as InferInsertModel<typeof documentsTable>;

        const newDbDocument = await this.db
          .insert(documentsTable)
          .values(insertData)
          .returning();

        const signedDocumentToken = await this.jwtService.signAsync({
          userId: userId,
          documentId: newDbDocument[0].id,
        });

        if (data.type === '2') {
          await this.emailsService.sendPendingDocumentVerificationEmail(
            userId,
            fileUrl,
            file.originalname,
            signedDocumentToken,
            newDbDocument[0].id,
          );
        }

        return newDbDocument;
      } catch (err) {
        throw new BadRequestException(
          `Failed to upload file to S3: ${err.message}`,
        );
      }
    }
  }

  async findAll() {
    return await this.db.select().from(documentsTable);
  }

  async findOne(id: number) {
    return await this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id));
  }

  async update(
    id: number,
    updateDocumentDto: z.infer<typeof UpdateDocumentDto>,
    userId: number,
  ) {
    const dbUser = await this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbDocument = await this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id));

    if (!dbDocument.length) throw new NotFoundException('Document not found');
    if (dbDocument[0].userId !== userId)
      throw new UnauthorizedException('You can only edit your documents');

    return await this.db
      .update(documentsTable)
      .set(updateDocumentDto as InferInsertModel<typeof documentsTable>)
      .where(eq(documentsTable.id, id))
      .returning();
  }

  async remove(id: number, userId: number) {
    const dbUser = await this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbDocument = await this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id));

    if (!dbDocument.length) throw new NotFoundException('Document not found');
    if (documentsTable[0].userId !== userId)
      throw new UnauthorizedException('You can only delete your own documents');

    return await this.db
      .delete(documentsTable)
      .where(eq(documentsTable.id, id));
  }

  async approveOrDeny(id: number, token: string, approve: boolean) {
    const dbDocument = await this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id));

    if (!dbDocument.length) {
      throw new NotFoundException('Document not found');
    }

    const tokenContent = this.jwtService.decode(token) as {
      documentId: string;
      userId: string;
    };

    if (!tokenContent.userId || !tokenContent.documentId) {
      throw new BadRequestException(
        'An invalid token was passed to the request',
      );
    }

    const updateData = { isApproved: approve } as Partial<
      InferInsertModel<typeof documentsTable>
    >;

    return await this.db
      .update(documentsTable)
      .set(updateData)
      .where(eq(documentsTable.id, id));
  }
}
