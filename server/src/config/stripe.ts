import Stripe from 'stripe';
import { config } from './index.js';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Create a Stripe Connect account for a reader
export async function createConnectAccount(email: string, country: string = 'US'): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    settings: {
      payouts: {
        schedule: {
          interval: 'daily',
        },
      },
    },
  });

  return account;
}

// Create onboarding link for Connect account
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

// Check if Connect account is fully onboarded
export async function getAccountStatus(accountId: string): Promise<{
  status: 'pending' | 'active' | 'restricted';
  details: Stripe.Account;
}> {
  const account = await stripe.accounts.retrieve(accountId);

  let status: 'pending' | 'active' | 'restricted' = 'pending';

  if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
    status = 'active';
  } else if (account.requirements?.disabled_reason) {
    status = 'restricted';
  }

  return { status, details: account };
}

// Create a customer for balance management
export async function createCustomer(email: string, name: string): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      platform: 'soulseer',
    },
  });
}

// Create a payment intent for adding funds
export async function createPaymentIntent(
  customerId: string,
  amount: number,
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    metadata: {
      platform: 'soulseer',
      ...metadata,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

// Transfer funds to reader's Connect account
export async function transferToReader(
  amount: number,
  destinationAccountId: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination: destinationAccountId,
    metadata: {
      platform: 'soulseer',
      ...metadata,
    },
  });
}

// Sync products from Stripe
export async function syncProducts(): Promise<Stripe.Product[]> {
  const products = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ['data.default_price'],
  });

  return products.data;
}

// Create a product in Stripe
export async function createProduct(
  name: string,
  description: string,
  price: number,
  metadata: Record<string, string> = {}
): Promise<{ product: Stripe.Product; price: Stripe.Price }> {
  const product = await stripe.products.create({
    name,
    description,
    metadata,
  });

  const priceObj = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100),
    currency: 'usd',
  });

  return { product, price: priceObj };
}

export default stripe;
