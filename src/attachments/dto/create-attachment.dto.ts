import { ATTACHMENT_TYPE_CHOICES } from 'src/drizzle/schema/enums/attachment.enum';
import { z } from 'zod';

export const CreateAttachmentDto = z.object({
  name: z.string().nonempty({ error: 'Attachment name is required' }),
  type: z.enum(ATTACHMENT_TYPE_CHOICES, {
    error: 'Invalid attachment type',
  }),
  tags: z.string({ error: 'Attachment tags must be a string' }),
  advertId: z.number({ error: 'Advert id must be a number' }).optional(),
});
