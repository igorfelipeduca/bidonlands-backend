import { AdvertType } from 'src/drizzle/schema/adverts.schema';
import { UserType } from 'src/drizzle/schema/users.schema';

export function AdvertWinnerEmail({
  user,
  formattedAmount,
  advert,
}: {
  user: UserType;
  formattedAmount: string;
  advert: AdvertType;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #14532d; font-size: 2rem; margin-bottom: 1.5rem;">Congratulations, ${user.firstName}!</h1>
      <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">
        You are the official winner of the auction <strong>"${advert.title}"</strong> with a final bid of <strong style="color: #14532d; font-size: 1.2rem;">${formattedAmount}</strong>.
      </p>
      <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">
        <strong>Important:</strong> By law, you are now contractually obligated to pay the full bid amount within <strong>24 hours</strong> of this notification. Failure to do so may result in legal action and forfeiture of your rights to the property.
      </p>
      <div style="background: #f0fdf4; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="color: #166534; font-size: 1.1rem; margin-bottom: 0.5rem;">Wire Transfer Instructions</h2>
        <p style="margin: 0.5rem 0;">Bank Name: <strong>First Principle Bank</strong></p>
        <p style="margin: 0.5rem 0;">Account Number: <strong>1234567890</strong></p>
        <p style="margin: 0.5rem 0;">Routing Number: <strong>987654321</strong></p>
        <p style="margin: 0.5rem 0;">Account Holder: <strong>BidOnLands LLC</strong></p>
        <p style="margin: 0.5rem 0;">Reference: <strong>${user.email} - auction Winner</strong></p>
      </div>
      <p style="font-size: 1.1rem; margin-bottom: 2rem;">
        <strong>Act now:</strong> Initiate your payment immediately to secure your purchase. If you have questions or require assistance, reply to this email without delay.
      </p>
      <p style="font-size: 1rem; color: #64748b;">This is a legally binding transaction. Do not ignore this notice.</p>
    </div>
  `;
}
