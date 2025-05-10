import { DOCUMENT_TYPE_CHOICES } from 'src/drizzle/schema/enums/document.enum';
import { z } from 'zod';

export const CreateDocumentDto = z.object({
  name: z.string().nonempty({ error: 'Document name is required' }),
  type: z.enum(DOCUMENT_TYPE_CHOICES, {
    error: 'Invalid document type',
  }),
  tags: z.string({ error: 'Document tags must be a string' }),
  advertId: z.string({ error: 'Advert id must be a string' }).optional(),
});
