import { Router } from 'express';
import { requireAuth, requireUser, requireReader } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { db } from '../db/index.js';
import { users, clientProfiles, readerProfiles, transactions, pendingPayouts } from '../db/schema.js';
import { eq, sql, desc, and, sum } from 'drizzle-orm';
import { stripe, createConnectAccount, createPaymentIntent, createAccountLink, getAccountStatus, transferToReader } from '../config/stripe.js';
import { config } from '../config/index.js';

const router = Router();

// Add funds to client balance
router.post('/add-funds', requireAuth(), requireUser, paymentLimiter, asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount < 5) {
    throw new ValidationError('Minimum amount is $5');
  }

  if (amount > 500) {
    throw new ValidationError('Maximum amount is $500 per transaction');
  }

  // Get client profile
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client || !client.stripeCustomerId) {
    throw new NotFoundError('Client profile');
  }

  // Create payment intent
  const paymentIntent = await createPaymentIntent(
    client.stripeCustomerId,
    amount,
    {
      userId: req.userId!,
      type: 'add_funds',
    }
  );

  // Create pending transaction
  await db.insert(transactions).values({
    userId: req.userId!,
    type: 'deposit',
    amount: amount.toString(),
    fee: '0',
    netAmount: amount.toString(),
    status: 'pending',
    stripePaymentIntentId: paymentIntent.id,
    description: 'Add funds to account balance',
  });

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    },
  });
}));

// Get client balance
router.get('/balance', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const [client] = await db
    .select({
      balance: clientProfiles.balance,
      totalSpent: clientProfiles.totalSpent,
    })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client) {
    throw new NotFoundError('Client profile');
  }

  res.json({
    success: true,
    data: {
      balance: Number(client.balance),
      totalSpent: Number(client.totalSpent),
    },
  });
}));

// Get payment methods
router.get('/methods', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client || !client.stripeCustomerId) {
    return res.json({
      success: true,
      data: [],
    });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: client.stripeCustomerId,
    type: 'card',
  });

  res.json({
    success: true,
    data: paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === client.defaultPaymentMethodId,
    })),
  });
}));

// Set default payment method
router.patch('/methods/:methodId/default', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const methodId = req.params.methodId as string;

  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client || !client.stripeCustomerId) {
    throw new NotFoundError('Client profile');
  }

  // Update Stripe customer default payment method
  await stripe.customers.update(client.stripeCustomerId, {
    invoice_settings: { default_payment_method: methodId },
  });

  // Update our database
  await db
    .update(clientProfiles)
    .set({
      defaultPaymentMethodId: methodId,
      updatedAt: new Date(),
    })
    .where(eq(clientProfiles.userId, req.userId!));

  res.json({
    success: true,
    message: 'Default payment method updated',
  });
}));

// Delete payment method
router.delete('/methods/:methodId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const methodId = req.params.methodId as string;

  await stripe.paymentMethods.detach(methodId);

  // If this was the default, clear it
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (client?.defaultPaymentMethodId === methodId) {
    await db
      .update(clientProfiles)
      .set({
        defaultPaymentMethodId: null,
        updatedAt: new Date(),
      })
      .where(eq(clientProfiles.userId, req.userId!));
  }

  res.json({
    success: true,
    message: 'Payment method removed',
  });
}));

// Get transaction history
router.get('/transactions', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = eq(transactions.userId, req.userId!);

  const txns = await db
    .select()
    .from(transactions)
    .where(whereClause)
    .orderBy(desc(transactions.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: txns,
  });
}));

// ===== Reader Payment Routes =====

// Get reader earnings
router.get('/reader/earnings', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, req.userId!))
    .limit(1);

  if (!reader) {
    throw new NotFoundError('Reader profile');
  }

  // Get pending earnings (not yet transferred)
  const [pendingResult] = await db
    .select({
      total: sum(transactions.netAmount),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, req.userId!),
        eq(transactions.type, 'reading_earning'),
        eq(transactions.status, 'completed')
      )
    );

  // Get total paid out
  const [paidResult] = await db
    .select({
      total: sum(pendingPayouts.amount),
    })
    .from(pendingPayouts)
    .where(
      and(
        eq(pendingPayouts.readerId, req.userId!),
        eq(pendingPayouts.status, 'completed')
      )
    );

  const totalEarned = Number(pendingResult?.total || 0);
  const totalPaidOut = Number(paidResult?.total || 0);
  const pendingBalance = totalEarned - totalPaidOut;

  res.json({
    success: true,
    data: {
      pendingBalance,
      totalEarned,
      totalPaidOut,
      stripeAccountStatus: reader.stripeAccountStatus,
      minPayoutAmount: config.payment.minPayoutAmount,
    },
  });
}));

// Setup Stripe Connect account
router.post('/reader/connect/setup', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, req.userId!))
    .limit(1);

  if (!reader) {
    throw new NotFoundError('Reader profile');
  }

  if (reader.stripeAccountId) {
    // Generate new onboarding link for existing account
    const accountLink = await createAccountLink(
      reader.stripeAccountId,
      `${config.frontendUrl}/dashboard/payments?refresh=true`,
      `${config.frontendUrl}/dashboard/payments?success=true`
    );

    return res.json({
      success: true,
      data: { url: accountLink.url },
    });
  }

  // Get user email
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  // Create new Stripe Connect account
  const account = await createConnectAccount(user?.email || '');

  // Save account ID
  await db
    .update(readerProfiles)
    .set({
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(readerProfiles.userId, req.userId!));

  // Generate onboarding link
  const accountLink = await createAccountLink(
    account.id,
    `${config.frontendUrl}/dashboard/payments?refresh=true`,
    `${config.frontendUrl}/dashboard/payments?success=true`
  );

  res.json({
    success: true,
    data: { url: accountLink.url },
  });
}));

// Get Stripe Connect account status
router.get('/reader/connect/status', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, req.userId!))
    .limit(1);

  if (!reader) {
    throw new NotFoundError('Reader profile');
  }

  if (!reader.stripeAccountId) {
    return res.json({
      success: true,
      data: {
        status: 'not_setup',
        accountId: null,
      },
    });
  }

  const { status, details } = await getAccountStatus(reader.stripeAccountId);

  // Update status in database if changed
  if (status !== reader.stripeAccountStatus) {
    await db
      .update(readerProfiles)
      .set({
        stripeAccountStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(readerProfiles.userId, req.userId!));
  }

  res.json({
    success: true,
    data: {
      status,
      accountId: reader.stripeAccountId,
      chargesEnabled: details.charges_enabled,
      payoutsEnabled: details.payouts_enabled,
      requirements: details.requirements,
    },
  });
}));

// Request payout (manual)
router.post('/reader/payout', requireAuth(), requireReader, paymentLimiter, asyncHandler(async (req, res) => {
  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, req.userId!))
    .limit(1);

  if (!reader) {
    throw new NotFoundError('Reader profile');
  }

  if (!reader.stripeAccountId || reader.stripeAccountStatus !== 'active') {
    throw new ValidationError('Stripe Connect account not set up or not active');
  }

  // Calculate pending balance
  const [pendingResult] = await db
    .select({
      total: sum(transactions.netAmount),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, req.userId!),
        eq(transactions.type, 'reading_earning'),
        eq(transactions.status, 'completed')
      )
    );

  const [paidResult] = await db
    .select({
      total: sum(pendingPayouts.amount),
    })
    .from(pendingPayouts)
    .where(eq(pendingPayouts.readerId, req.userId!));

  const pendingBalance = Number(pendingResult?.total || 0) - Number(paidResult?.total || 0);

  if (pendingBalance < config.payment.minPayoutAmount) {
    throw new ValidationError(`Minimum payout amount is $${config.payment.minPayoutAmount}`);
  }

  // Create transfer
  const transfer = await transferToReader(
    pendingBalance,
    reader.stripeAccountId,
    { readerId: req.userId! }
  );

  // Record payout
  await db.insert(pendingPayouts).values({
    readerId: req.userId!,
    amount: pendingBalance.toString(),
    status: 'completed',
    stripeTransferId: transfer.id,
    processedAt: new Date(),
  });

  // Create transaction record
  await db.insert(transactions).values({
    userId: req.userId!,
    type: 'payout',
    amount: pendingBalance.toString(),
    fee: '0',
    netAmount: pendingBalance.toString(),
    status: 'completed',
    stripeTransferId: transfer.id,
    description: 'Payout to Stripe Connect account',
  });

  res.json({
    success: true,
    message: `Successfully transferred $${pendingBalance.toFixed(2)} to your account`,
    data: {
      amount: pendingBalance,
      transferId: transfer.id,
    },
  });
}));

export default router;
