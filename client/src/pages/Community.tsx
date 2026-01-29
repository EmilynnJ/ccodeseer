import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Eye, Clock, Pin, Lock } from 'lucide-react';
import api from '../services/api';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
  postCount: number;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    profileImage: string;
    role: string;
  };
}

export default function Community() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.getForumCategories();
        setCategories(response.data.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const fetchPosts = async () => {
        try {
          const response = await api.getForumPosts(selectedCategory);
          setPosts(response.data.data);
        } catch (error) {
          console.error('Error fetching posts:', error);
        }
      };

      fetchPosts();
    }
  }, [selectedCategory]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="skeleton h-8 w-48 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-playfair text-white mb-4">Community</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Connect with fellow seekers, share experiences, and learn from our community.
          </p>
        </div>

        {!selectedCategory ? (
          // Categories View
          <div className="space-y-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="card-hover p-6 w-full text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-primary-400/20 rounded-full flex items-center justify-center">
                  <MessageSquare size={24} className="text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                  <p className="text-gray-400 text-sm">{category.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-primary-400 font-semibold">{category.postCount}</p>
                  <p className="text-gray-500 text-sm">posts</p>
                </div>
              </button>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-16">
                <Users size={64} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl text-white mb-2">No Categories Yet</h3>
                <p className="text-gray-400">
                  The community forum is being set up. Check back soon!
                </p>
              </div>
            )}
          </div>
        ) : (
          // Posts View
          <div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-primary-400 hover:text-primary-300 mb-6 flex items-center gap-2"
            >
              ← Back to Categories
            </button>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-playfair text-white">
                {categories.find((c) => c.id === selectedCategory)?.name}
              </h2>
              <button className="btn-primary">New Post</button>
            </div>

            <div className="space-y-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/community/post/${post.id}`}
                  className="card-hover p-4 block"
                >
                  <div className="flex gap-4">
                    <img
                      src={post.author.profileImage}
                      alt={post.author.fullName}
                      className="avatar avatar-md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.isPinned && (
                          <Pin size={14} className="text-gold-400" />
                        )}
                        {post.isLocked && (
                          <Lock size={14} className="text-gray-500" />
                        )}
                        <h3 className="text-lg font-semibold text-white truncate">
                          {post.title}
                        </h3>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-1 mb-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{post.author.fullName}</span>
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {post.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {post.replyCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {posts.length === 0 && (
                <div className="text-center py-12 card-glass">
                  <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
                  <h3 className="text-xl text-white mb-2">No Posts Yet</h3>
                  <p className="text-gray-400 mb-4">
                    Be the first to start a discussion!
                  </p>
                  <button className="btn-primary">Create Post</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
