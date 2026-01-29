import { Router, Request, Response } from 'express';
import { stripe } from '../config/stripe.js';
import { db } from '../db/index.js';
import { transactions, clientProfiles, orders, orderItems, shopProducts, readerProfiles } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { config } from '../config/index.js';
import Stripe from 'stripe';

const router = Router();

// Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('Received Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'transfer.created':
        console.log('Transfer created:', event.data.object);
        break;

      case 'payout.paid':
        console.log('Payout paid:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;
  const userId = metadata.userId;
  const type = metadata.type;

  if (!userId) {
    console.error('No userId in payment intent metadata');
    return;
  }

  // Update transaction status
  await db
    .update(transactions)
    .set({ status: 'completed' })
    .where(eq(transactions.stripePaymentIntentId, paymentIntent.id));

  if (type === 'add_funds') {
    // Add funds to client balance
    const amount = paymentIntent.amount / 100; // Convert from cents

    await db
      .update(clientProfiles)
      .set({
        balance: sql`${clientProfiles.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(clientProfiles.userId, userId));

    console.log(`Added $${amount} to user ${userId} balance`);
  } else if (type === 'shop_purchase') {
    // Handle shop purchase
    const orderId = metadata.orderId;

    if (orderId) {
      // Update order status
      await db
        .update(orders)
        .set({
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Get order items and update inventory
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        // Update inventory for physical products
        await db
          .update(shopProducts)
          .set({
            inventory: sql`CASE WHEN ${shopProducts.inventory} IS NOT NULL THEN ${shopProducts.inventory} - ${item.quantity} ELSE NULL END`,
          })
          .where(eq(shopProducts.id, item.productId));
      }

      console.log(`Order ${orderId} processed`);
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Update transaction status
  await db
    .update(transactions)
    .set({ status: 'failed' })
    .where(eq(transactions.stripePaymentIntentId, paymentIntent.id));

  console.log(`Payment failed: ${paymentIntent.id}`);
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Update reader's Stripe account status
  let status: 'pending' | 'active' | 'restricted' = 'pending';

  if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
    status = 'active';
  } else if (account.requirements?.disabled_reason) {
    status = 'restricted';
  }

  await db
    .update(readerProfiles)
    .set({
      stripeAccountStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(readerProfiles.stripeAccountId, account.id));

  console.log(`Updated account ${account.id} status to ${status}`);
}

// Clerk webhook handler (for user sync)
router.post('/clerk', async (req: Request, res: Response) => {
  // Clerk webhook handling
  const { type, data } = req.body;

  console.log('Received Clerk webhook:', type);

  try {
    switch (type) {
      case 'user.created':
        console.log('New user created in Clerk:', data.id);
        break;

      case 'user.updated':
        console.log('User updated in Clerk:', data.id);
        break;

      case 'user.deleted':
        console.log('User deleted in Clerk:', data.id);
        break;

      default:
        console.log(`Unhandled Clerk event: ${type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Clerk webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Agora notification webhook (for RTC events)
router.post('/agora', async (req: Request, res: Response) => {
  const { eventType, payload } = req.body;

  console.log('Received Agora webhook:', eventType);

  try {
    switch (eventType) {
      case 1: // Channel created
        console.log('Channel created:', payload);
        break;

      case 2: // Channel destroyed
        console.log('Channel destroyed:', payload);
        break;

      case 101: // Broadcaster join channel
        console.log('Broadcaster joined:', payload);
        break;

      case 102: // Broadcaster leave channel
        console.log('Broadcaster left:', payload);
        break;

      default:
        console.log(`Unhandled Agora event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Agora webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
