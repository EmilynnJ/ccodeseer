import { Router } from 'express';
import { requireAuth, requireUser, requireReader, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { shopProducts, orders, orderItems, clientProfiles, transactions } from '../db/schema.js';
import { eq, desc, and, sql, ilike, or } from 'drizzle-orm';
import { stripe, createProduct } from '../config/stripe.js';
import { config } from '../config/index.js';

const router = Router();

// Get all products
router.get('/products', asyncHandler(async (req, res) => {
  const { category, type, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereConditions = [eq(shopProducts.isActive, true)];

  if (category) {
    whereConditions.push(eq(shopProducts.category, category as string));
  }
  if (type) {
    whereConditions.push(eq(shopProducts.type, type as 'physical' | 'digital' | 'service'));
  }

  const products = await db
    .select()
    .from(shopProducts)
    .where(and(...whereConditions))
    .orderBy(desc(shopProducts.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: products,
  });
}));

// Get product categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await db
    .selectDistinct({ category: shopProducts.category })
    .from(shopProducts)
    .where(eq(shopProducts.isActive, true));

  res.json({
    success: true,
    data: categories.map(c => c.category),
  });
}));

// Get single product
router.get('/products/:productId', asyncHandler(async (req, res) => {
  const productId = req.params.productId as string;

  const [product] = await db
    .select()
    .from(shopProducts)
    .where(eq(shopProducts.id, productId))
    .limit(1);

  if (!product) {
    throw new NotFoundError('Product');
  }

  res.json({
    success: true,
    data: product,
  });
}));

// Create product (reader or admin)
router.post('/products', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const { name, description, price, type, category, images, inventory } = req.body;

  if (!name || !description || !price || !type || !category) {
    throw new ValidationError('Missing required fields');
  }

  // Create product in Stripe
  const { product: stripeProduct, price: stripePrice } = await createProduct(
    name,
    description,
    price,
    { readerId: req.userId!, type }
  );

  // Create in our database
  const [product] = await db
    .insert(shopProducts)
    .values({
      readerId: req.userRole === 'admin' ? null : req.userId!,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      name,
      description,
      images: images || [],
      type,
      category,
      price: price.toString(),
      inventory: type === 'physical' ? inventory : null,
    })
    .returning();

  res.status(201).json({
    success: true,
    data: product,
  });
}));

// Update product
router.patch('/products/:productId', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const productId = req.params.productId as string;
  const { name, description, images, inventory, isActive } = req.body;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(shopProducts)
    .where(eq(shopProducts.id, productId))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Product');
  }

  if (existing.readerId !== req.userId && req.userRole !== 'admin') {
    throw new ValidationError('Not authorized');
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (name) updateData.name = name;
  if (description) updateData.description = description;
  if (images) updateData.images = images;
  if (inventory !== undefined) updateData.inventory = inventory;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Update Stripe product if name/description changed
  if (name || description) {
    await stripe.products.update(existing.stripeProductId, {
      name: name || existing.name,
      description: description || existing.description,
    });
  }

  const [product] = await db
    .update(shopProducts)
    .set(updateData)
    .where(eq(shopProducts.id, productId))
    .returning();

  res.json({
    success: true,
    data: product,
  });
}));

// Purchase product(s)
router.post('/checkout', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError('No items provided');
  }

  // Validate items and calculate total
  let subtotal = 0;
  const orderItemsData: any[] = [];
  let hasPhysical = false;

  for (const item of items) {
    const [product] = await db
      .select()
      .from(shopProducts)
      .where(eq(shopProducts.id, item.productId))
      .limit(1);

    if (!product) {
      throw new NotFoundError(`Product ${item.productId}`);
    }

    if (!product.isActive) {
      throw new ValidationError(`Product ${product.name} is not available`);
    }

    if (product.type === 'physical') {
      hasPhysical = true;
      if (product.inventory !== null && product.inventory < item.quantity) {
        throw new ValidationError(`Insufficient stock for ${product.name}`);
      }
    }

    const itemTotal = Number(product.price) * item.quantity;
    subtotal += itemTotal;

    // Calculate reader earnings (70%)
    const readerEarnings = product.readerId ? itemTotal * 0.7 : null;

    orderItemsData.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
      readerId: product.readerId,
      readerEarnings: readerEarnings?.toString(),
    });
  }

  // Validate shipping address for physical products
  if (hasPhysical && !shippingAddress) {
    throw new ValidationError('Shipping address required for physical products');
  }

  // Calculate tax and shipping (simplified)
  const tax = subtotal * 0.08; // 8% tax
  const shipping = hasPhysical ? 5.99 : 0;
  const total = subtotal + tax + shipping;

  // Get client profile
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client?.stripeCustomerId) {
    throw new ValidationError('Payment method required');
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: 'usd',
    customer: client.stripeCustomerId,
    metadata: {
      userId: req.userId!,
      type: 'shop_purchase',
    },
    automatic_payment_methods: { enabled: true },
  });

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      customerId: req.userId!,
      status: 'pending',
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      shipping: shipping.toString(),
      total: total.toString(),
      shippingAddress: hasPhysical ? shippingAddress : null,
      stripePaymentIntentId: paymentIntent.id,
    })
    .returning();

  // Create order items
  for (const item of orderItemsData) {
    await db.insert(orderItems).values({
      orderId: order.id,
      ...item,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      orderId: order.id,
      clientSecret: paymentIntent.client_secret,
      total,
    },
  });
}));

// Get user's orders
router.get('/orders', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, req.userId!))
    .orderBy(desc(orders.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: userOrders,
  });
}));

// Get order details
router.get('/orders/:orderId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const orderId = req.params.orderId as string;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.customerId !== req.userId && req.userRole !== 'admin') {
    throw new ValidationError('Not authorized');
  }

  // Get order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  res.json({
    success: true,
    data: {
      ...order,
      items,
    },
  });
}));

// Sync products from Stripe (admin only)
router.post('/sync-stripe', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const stripeProducts = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ['data.default_price'],
  });

  let synced = 0;
  let created = 0;

  for (const product of stripeProducts.data) {
    if (!product.default_price || typeof product.default_price === 'string') {
      continue;
    }

    const price = product.default_price;
    const priceAmount = (price.unit_amount || 0) / 100;

    // Check if exists
    const [existing] = await db
      .select()
      .from(shopProducts)
      .where(eq(shopProducts.stripeProductId, product.id))
      .limit(1);

    if (existing) {
      // Update
      await db
        .update(shopProducts)
        .set({
          name: product.name,
          description: product.description || '',
          price: priceAmount.toString(),
          images: product.images,
          isActive: product.active,
          updatedAt: new Date(),
        })
        .where(eq(shopProducts.stripeProductId, product.id));
      synced++;
    } else {
      // Create
      await db.insert(shopProducts).values({
        stripeProductId: product.id,
        stripePriceId: price.id,
        name: product.name,
        description: product.description || '',
        images: product.images,
        type: (product.metadata.type as 'physical' | 'digital' | 'service') || 'physical',
        category: product.metadata.category || 'general',
        price: priceAmount.toString(),
      });
      created++;
    }
  }

  res.json({
    success: true,
    message: `Synced ${synced} products, created ${created} new products`,
  });
}));

// Get reader's products
router.get('/reader/my-products', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const products = await db
    .select()
    .from(shopProducts)
    .where(eq(shopProducts.readerId, req.userId!))
    .orderBy(desc(shopProducts.createdAt));

  res.json({
    success: true,
    data: products,
  });
}));

export default router;
