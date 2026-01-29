import { Router } from 'express';
import { requireAuth, requireUser, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { forumCategories, forumPosts, forumReplies, users } from '../db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';

const router = Router();

// Get all categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await db
    .select()
    .from(forumCategories)
    .orderBy(forumCategories.sortOrder);

  // Get post counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(forumPosts)
        .where(eq(forumPosts.categoryId, cat.id));

      return { ...cat, postCount: count };
    })
  );

  res.json({
    success: true,
    data: categoriesWithCounts,
  });
}));

// Create category (admin only)
router.post('/categories', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, slug, icon, sortOrder = 0 } = req.body;

  if (!name || !slug) {
    throw new ValidationError('Name and slug are required');
  }

  const [category] = await db
    .insert(forumCategories)
    .values({ name, description, slug, icon, sortOrder })
    .returning();

  res.status(201).json({
    success: true,
    data: category,
  });
}));

// Get posts in category
router.get('/categories/:categoryId/posts', asyncHandler(async (req, res) => {
  const categoryId = req.params.categoryId as string;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const posts = await db
    .select({
      id: forumPosts.id,
      title: forumPosts.title,
      content: forumPosts.content,
      images: forumPosts.images,
      isPinned: forumPosts.isPinned,
      isLocked: forumPosts.isLocked,
      viewCount: forumPosts.viewCount,
      replyCount: forumPosts.replyCount,
      lastReplyAt: forumPosts.lastReplyAt,
      createdAt: forumPosts.createdAt,
      author: {
        id: users.id,
        fullName: users.fullName,
        profileImage: users.profileImage,
        role: users.role,
      },
    })
    .from(forumPosts)
    .innerJoin(users, eq(forumPosts.authorId, users.id))
    .where(eq(forumPosts.categoryId, categoryId))
    .orderBy(desc(forumPosts.isPinned), desc(forumPosts.lastReplyAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: posts,
  });
}));

// Get single post with replies
router.get('/posts/:postId', asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;

  const [post] = await db
    .select({
      id: forumPosts.id,
      title: forumPosts.title,
      content: forumPosts.content,
      images: forumPosts.images,
      isPinned: forumPosts.isPinned,
      isLocked: forumPosts.isLocked,
      viewCount: forumPosts.viewCount,
      replyCount: forumPosts.replyCount,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
      categoryId: forumPosts.categoryId,
      author: {
        id: users.id,
        fullName: users.fullName,
        profileImage: users.profileImage,
        role: users.role,
      },
    })
    .from(forumPosts)
    .innerJoin(users, eq(forumPosts.authorId, users.id))
    .where(eq(forumPosts.id, postId))
    .limit(1);

  if (!post) {
    throw new NotFoundError('Post');
  }

  // Increment view count
  await db
    .update(forumPosts)
    .set({ viewCount: sql`${forumPosts.viewCount} + 1` })
    .where(eq(forumPosts.id, postId));

  // Get replies
  const replies = await db
    .select({
      id: forumReplies.id,
      content: forumReplies.content,
      parentReplyId: forumReplies.parentReplyId,
      createdAt: forumReplies.createdAt,
      updatedAt: forumReplies.updatedAt,
      author: {
        id: users.id,
        fullName: users.fullName,
        profileImage: users.profileImage,
        role: users.role,
      },
    })
    .from(forumReplies)
    .innerJoin(users, eq(forumReplies.authorId, users.id))
    .where(eq(forumReplies.postId, postId))
    .orderBy(forumReplies.createdAt);

  res.json({
    success: true,
    data: {
      ...post,
      replies,
    },
  });
}));

// Create post
router.post('/posts', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { categoryId, title, content, images } = req.body;

  if (!categoryId || !title || !content) {
    throw new ValidationError('Category, title, and content are required');
  }

  // Verify category exists
  const [category] = await db
    .select()
    .from(forumCategories)
    .where(eq(forumCategories.id, categoryId))
    .limit(1);

  if (!category) {
    throw new NotFoundError('Category');
  }

  const [post] = await db
    .insert(forumPosts)
    .values({
      authorId: req.userId!,
      categoryId,
      title,
      content,
      images: images || [],
    })
    .returning();

  res.status(201).json({
    success: true,
    data: post,
  });
}));

// Update post
router.patch('/posts/:postId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const { title, content, images } = req.body;

  const [post] = await db
    .select()
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1);

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (post.authorId !== req.userId && req.userRole !== 'admin') {
    throw new ValidationError('Not authorized');
  }

  if (post.isLocked && req.userRole !== 'admin') {
    throw new ValidationError('Post is locked');
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (title) updateData.title = title;
  if (content) updateData.content = content;
  if (images) updateData.images = images;

  const [updated] = await db
    .update(forumPosts)
    .set(updateData)
    .where(eq(forumPosts.id, postId))
    .returning();

  res.json({
    success: true,
    data: updated,
  });
}));

// Delete post
router.delete('/posts/:postId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;

  const [post] = await db
    .select()
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1);

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (post.authorId !== req.userId && req.userRole !== 'admin') {
    throw new ValidationError('Not authorized');
  }

  // Delete replies first
  await db.delete(forumReplies).where(eq(forumReplies.postId, postId));

  // Delete post
  await db.delete(forumPosts).where(eq(forumPosts.id, postId));

  res.json({
    success: true,
    message: 'Post deleted',
  });
}));

// Create reply
router.post('/posts/:postId/replies', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const { content, parentReplyId } = req.body;

  if (!content) {
    throw new ValidationError('Content is required');
  }

  const [post] = await db
    .select()
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1);

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (post.isLocked) {
    throw new ValidationError('Post is locked');
  }

  const [reply] = await db
    .insert(forumReplies)
    .values({
      postId,
      authorId: req.userId!,
      parentReplyId,
      content,
    })
    .returning();

  // Update post reply count and last reply time
  await db
    .update(forumPosts)
    .set({
      replyCount: sql`${forumPosts.replyCount} + 1`,
      lastReplyAt: new Date(),
    })
    .where(eq(forumPosts.id, postId));

  res.status(201).json({
    success: true,
    data: reply,
  });
}));

// Delete reply
router.delete('/replies/:replyId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const replyId = req.params.replyId as string;

  const [reply] = await db
    .select()
    .from(forumReplies)
    .where(eq(forumReplies.id, replyId))
    .limit(1);

  if (!reply) {
    throw new NotFoundError('Reply');
  }

  if (reply.authorId !== req.userId && req.userRole !== 'admin') {
    throw new ValidationError('Not authorized');
  }

  await db.delete(forumReplies).where(eq(forumReplies.id, replyId));

  // Update post reply count
  await db
    .update(forumPosts)
    .set({ replyCount: sql`${forumPosts.replyCount} - 1` })
    .where(eq(forumPosts.id, reply.postId));

  res.json({
    success: true,
    message: 'Reply deleted',
  });
}));

// Pin/unpin post (admin only)
router.patch('/posts/:postId/pin', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const { isPinned } = req.body;

  const [updated] = await db
    .update(forumPosts)
    .set({ isPinned, updatedAt: new Date() })
    .where(eq(forumPosts.id, postId))
    .returning();

  res.json({
    success: true,
    data: updated,
  });
}));

// Lock/unlock post (admin only)
router.patch('/posts/:postId/lock', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const { isLocked } = req.body;

  const [updated] = await db
    .update(forumPosts)
    .set({ isLocked, updatedAt: new Date() })
    .where(eq(forumPosts.id, postId))
    .returning();

  res.json({
    success: true,
    data: updated,
  });
}));

export default router;
