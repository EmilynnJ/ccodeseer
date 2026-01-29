import { useEffect, useState } from 'react';
import { ShoppingBag, Package, Download, Sparkles, Filter } from 'lucide-react';
import api from '../services/api';

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  type: 'physical' | 'digital' | 'service';
  category: string;
  price: number;
  readerId?: string;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.getProducts({ limit: 50 }),
          api.getCategories(),
        ]);
        setProducts(productsRes.data.data);
        setCategories(categoriesRes.data.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    const matchesType = selectedType === 'all' || product.type === selectedType;
    return matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'physical':
        return <Package size={14} />;
      case 'digital':
        return <Download size={14} />;
      case 'service':
        return <Sparkles size={14} />;
      default:
        return <ShoppingBag size={14} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="skeleton h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-playfair text-white mb-4">Mystical Shop</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover spiritual tools, digital guides, and services from our gifted readers.
          </p>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <div className="flex gap-2">
              {['all', 'physical', 'digital', 'service'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    selectedType === type
                      ? 'bg-primary-400/20 text-primary-400 border border-primary-400'
                      : 'bg-dark-700 text-gray-400 border border-transparent hover:border-primary-400/30'
                  }`}
                >
                  {type !== 'all' && getTypeIcon(type)}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex-1 flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input max-w-xs"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="card-hover overflow-hidden group">
                {/* Image */}
                <div className="aspect-square bg-dark-700 relative">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(product.type)}
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-3 left-3">
                    <span className="badge-primary flex items-center gap-1">
                      {getTypeIcon(product.type)}
                      {product.type}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-gold-400 font-semibold text-lg">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    <button className="btn-primary btn-sm">Add to Cart</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag size={64} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl text-white mb-2">No Products Found</h3>
            <p className="text-gray-400">
              Try adjusting your filters to see more products.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
