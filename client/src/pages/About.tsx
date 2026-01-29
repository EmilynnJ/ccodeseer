import { Heart, Shield, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-playfair text-white mb-6">
                About <span className="brand-title">SoulSeer</span>
              </h1>
              <div className="space-y-6 text-gray-300 text-lg leading-relaxed">
                <p>
                  At SoulSeer, we are dedicated to providing ethical, compassionate, and
                  judgment-free spiritual guidance. Our mission is twofold: to offer clients
                  genuine, heart-centered readings and to uphold fair, ethical standards for
                  our readers.
                </p>
                <p>
                  Founded by psychic medium Emilynn, SoulSeer was created as a response to
                  the corporate greed that dominates many psychic platforms. Unlike other apps,
                  our readers keep the majority of what they earn and play an active role in
                  shaping the platform.
                </p>
                <p>
                  SoulSeer is more than just an app—it's a soul tribe. A community of gifted
                  psychics united by our life's calling: to guide, heal, and empower those who
                  seek clarity on their journey.
                </p>
              </div>
            </div>

            {/* Founder Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400/20 to-gold-400/20 rounded-2xl blur-3xl" />
              <img
                src="https://i.postimg.cc/s2ds9RtC/FOUNDER.jpg"
                alt="Emilynn - Founder of SoulSeer"
                className="relative rounded-2xl shadow-2xl border border-primary-400/20 w-full"
              />
              <div className="absolute bottom-6 left-6 right-6 bg-dark-900/90 backdrop-blur-sm rounded-xl p-4 border border-primary-400/20">
                <h3 className="brand-title text-2xl mb-1">Emilynn</h3>
                <p className="text-gray-400 text-sm">Founder & Psychic Medium</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair text-white mb-4">Our Values</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              The principles that guide everything we do at SoulSeer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Compassion */}
            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={24} className="text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Compassion</h3>
              <p className="text-gray-400 text-sm">
                Every reading is delivered with genuine care and understanding for your journey.
              </p>
            </div>

            {/* Ethics */}
            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-gold-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ethics</h3>
              <p className="text-gray-400 text-sm">
                Fair treatment for both clients and readers. No hidden fees, no exploitation.
              </p>
            </div>

            {/* Community */}
            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Community</h3>
              <p className="text-gray-400 text-sm">
                A soul tribe where readers and clients support and uplift each other.
              </p>
            </div>

            {/* Authenticity */}
            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={24} className="text-gold-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Authenticity</h3>
              <p className="text-gray-400 text-sm">
                Real gifted psychics providing genuine guidance, not scripted responses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-playfair text-white mb-6">
                Why Choose SoulSeer?
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-primary-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 font-bold">70%</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Readers Keep 70%</h3>
                    <p className="text-gray-400 text-sm">
                      Unlike other platforms that take up to 70% from readers, we believe in fair compensation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-400 font-bold">$</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Pay Per Minute</h3>
                    <p className="text-gray-400 text-sm">
                      Only pay for the time you use. Add funds to your balance and spend as you go.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-primary-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Vetted Readers</h3>
                    <p className="text-gray-400 text-sm">
                      Every reader is carefully reviewed to ensure genuine abilities and ethical practices.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart size={18} className="text-gold-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Judgment-Free Space</h3>
                    <p className="text-gray-400 text-sm">
                      Come as you are. We welcome all seekers with open hearts and open minds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-glass p-8">
              <h3 className="text-2xl font-playfair text-white mb-4">
                Ready to Connect?
              </h3>
              <p className="text-gray-400 mb-6">
                Join our community of seekers and find the guidance you're looking for.
              </p>
              <Link to="/readers" className="btn-primary w-full justify-center">
                Browse Our Readers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-dark-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-playfair text-white mb-4">
            Get in Touch
          </h2>
          <p className="text-gray-400 mb-8">
            Have questions? We'd love to hear from you.
          </p>
          <div className="card-glass p-8">
            <p className="text-gray-300 mb-4">
              For support inquiries, please email us at:
            </p>
            <a
              href="mailto:support@soulseer.app"
              className="text-primary-400 text-lg hover:text-primary-300 transition-colors"
            >
              support@soulseer.app
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
