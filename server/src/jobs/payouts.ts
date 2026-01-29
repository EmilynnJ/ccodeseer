import { db } from '../db/index.js';
import { readerProfiles, pendingPayouts, transactions } from '../db/schema.js';
import { eq, gte, and, sql } from 'drizzle-orm';
import { transferToReader } from '../config/stripe.js';
import { config } from '../config/index.js';

const MIN_PAYOUT = config.payment.minPayoutAmount; // $15

// Process daily automated payouts for all eligible readers
export async function processAutomaticPayouts(): Promise<{
  processed: number;
  failed: number;
  totalAmount: number;
}> {
  console.log('[Payouts] Starting automatic payout processing...');

  let processed = 0;
  let failed = 0;
  let totalAmount = 0;

  try {
    // Find all readers with pending balance >= minimum payout and active Stripe accounts
    const eligibleReaders = await db
      .select()
      .from(readerProfiles)
      .where(
        and(
          gte(readerProfiles.pendingBalance, MIN_PAYOUT.toString()),
          eq(readerProfiles.stripeAccountStatus, 'active')
        )
      );

    console.log(`[Payouts] Found ${eligibleReaders.length} eligible readers`);

    for (const reader of eligibleReaders) {
      try {
        if (!reader.stripeAccountId) {
          console.warn(`[Payouts] Reader ${reader.id} has no Stripe account ID, skipping`);
          continue;
        }

        const payoutAmount = Number(reader.pendingBalance);

        // Create pending payout record
        const [payout] = await db
          .insert(pendingPayouts)
          .values({
            readerId: reader.id,
            amount: reader.pendingBalance,
            status: 'processing',
            stripeTransferId: '',
          })
          .returning();

        // Transfer via Stripe
        const transfer = await transferToReader(
          payoutAmount,
          reader.stripeAccountId,
          {
            readerId: reader.id,
            payoutId: payout.id,
            type: 'automatic_daily',
          }
        );

        // Update payout record with Stripe transfer ID
        await db
          .update(pendingPayouts)
          .set({
            status: 'completed',
            stripeTransferId: transfer.id,
            processedAt: new Date(),
          })
          .where(eq(pendingPayouts.id, payout.id));

        // Reset reader's pending balance
        await db
          .update(readerProfiles)
          .set({
            pendingBalance: '0',
            totalPaidOut: sql`${readerProfiles.totalPaidOut} + ${reader.pendingBalance}`,
            updatedAt: new Date(),
          })
          .where(eq(readerProfiles.id, reader.id));

        // Create transaction record
        await db.insert(transactions).values({
          userId: reader.userId,
          type: 'payout',
          amount: reader.pendingBalance,
          fee: '0',
          netAmount: reader.pendingBalance,
          status: 'completed',
          description: `Automatic daily payout - $${payoutAmount.toFixed(2)}`,
          stripePaymentIntentId: transfer.id,
        });

        processed++;
        totalAmount += payoutAmount;
        console.log(`[Payouts] Processed $${payoutAmount.toFixed(2)} for reader ${reader.id}`);
      } catch (error) {
        failed++;
        console.error(`[Payouts] Failed payout for reader ${reader.id}:`, error);

        // Mark payout as failed if it was created
        // This is a best-effort cleanup
        try {
          await db
            .update(pendingPayouts)
            .set({ status: 'failed' })
            .where(
              and(
                eq(pendingPayouts.readerId, reader.id),
                eq(pendingPayouts.status, 'processing')
              )
            );
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch (error) {
    console.error('[Payouts] Fatal error in payout processing:', error);
  }

  console.log(
    `[Payouts] Complete: ${processed} processed, ${failed} failed, $${totalAmount.toFixed(2)} total`
  );

  return { processed, failed, totalAmount };
}

// Schedule payouts to run daily at 2 AM UTC
export function schedulePayouts(): NodeJS.Timeout {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Calculate time until next 2 AM UTC
  const now = new Date();
  const next2AM = new Date(now);
  next2AM.setUTCHours(2, 0, 0, 0);
  if (next2AM <= now) {
    next2AM.setDate(next2AM.getDate() + 1);
  }
  const timeUntilFirst = next2AM.getTime() - now.getTime();

  console.log(`[Payouts] Scheduled first payout run in ${Math.round(timeUntilFirst / 1000 / 60)} minutes`);

  // First run at 2 AM
  const firstTimeout = setTimeout(() => {
    processAutomaticPayouts();
    // Then run every 24 hours
    setInterval(processAutomaticPayouts, TWENTY_FOUR_HOURS);
  }, timeUntilFirst);

  return firstTimeout;
}
