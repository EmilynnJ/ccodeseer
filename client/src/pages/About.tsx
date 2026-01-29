import { Heart, Shield, Users, Star, MessageCircle, Phone, Video, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do readings work on SoulSeer?',
    answer: 'Choose a reader, select your reading type (chat, voice, or video), add funds to your account, and connect instantly. You pay per minute and can end the session at any time.',
  },
  {
    question: 'How much does a reading cost?',
    answer: 'Each reader sets their own per-minute rates for chat, voice, and video readings. Rates are displayed on each reader\'s profile so you can choose what fits your budget.',
  },
  {
    question: 'How do I add funds to my account?',
    answer: 'Go to your Dashboard > Wallet and add funds using any major credit or debit card via our secure Stripe payment system. Your balance is used during readings at the per-minute rate.',
  },
  {
    question: 'Are the psychics on SoulSeer real?',
    answer: 'Yes. Every reader on SoulSeer is personally reviewed and approved by our team. We only accept readers who demonstrate genuine psychic abilities and adhere to our ethical guidelines.',
  },
  {
    question: 'Can I become a reader on SoulSeer?',
    answer: 'Reader accounts are created by our admin team to ensure quality. If you\'re a gifted psychic interested in joining, please contact us at support@soulseer.app with your background and experience.',
  },
  {
    question: 'How do readers get paid?',
    answer: 'Readers keep 70% of all earnings. Payouts are processed daily via Stripe Connect to your bank account, with a minimum payout threshold of $15.',
  },
  {
    question: 'Is my reading private?',
    answer: 'Absolutely. All one-on-one readings (chat, voice, and video) are completely private between you and your reader. We do not record or monitor private sessions.',
  },
  {
    question: 'What if I\'m not satisfied with my reading?',
    answer: 'We want every experience to be positive. If you have concerns about a reading, contact our support team and we\'ll work with you to find a resolution.',
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-primary-400/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-700/50 transition-colors"
      >
        <span className="text-white font-medium pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp size={20} className="text-primary-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-gray-400 leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={24} className="text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Compassion</h3>
              <p className="text-gray-400 text-sm">
                Every reading is delivered with genuine care and understanding for your journey.
              </p>
            </div>

            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-gold-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ethics</h3>
              <p className="text-gray-400 text-sm">
                Fair treatment for both clients and readers. No hidden fees, no exploitation.
              </p>
            </div>

            <div className="card-glass p-6 text-center">
              <div className="w-14 h-14 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Community</h3>
              <p className="text-gray-400 text-sm">
                A soul tribe where readers and clients support and uplift each other.
              </p>
            </div>

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

      {/* How Readings Work Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair text-white mb-4">How Readings Work</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Three ways to connect with your psychic reader, all pay-per-minute
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-glass p-8 text-center">
              <div className="w-16 h-16 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle size={28} className="text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Chat Readings</h3>
              <p className="text-gray-400 mb-4">
                Text-based readings in real time. Perfect for when you need guidance
                but prefer a quiet, written conversation. Take your time to absorb
                the messages at your own pace.
              </p>
              <p className="text-primary-400 text-sm font-medium">
                Most affordable option
              </p>
            </div>

            <div className="card-glass p-8 text-center">
              <div className="w-16 h-16 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone size={28} className="text-gold-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Voice Readings</h3>
              <p className="text-gray-400 mb-4">
                Speak directly with your psychic reader. Voice readings offer a more
                personal connection, allowing for a natural flow of spiritual guidance
                and immediate follow-up questions.
              </p>
              <p className="text-gold-400 text-sm font-medium">
                Personal and intimate
              </p>
            </div>

            <div className="card-glass p-8 text-center">
              <div className="w-16 h-16 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video size={28} className="text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Video Readings</h3>
              <p className="text-gray-400 mb-4">
                Face-to-face readings via live video. The most immersive experience—see
                your reader's expressions, watch card spreads, and feel fully present
                in your spiritual session.
              </p>
              <p className="text-primary-400 text-sm font-medium">
                Most immersive experience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Transparency Section */}
      <section className="py-16 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair text-white mb-4">Transparent Pricing</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              No hidden fees, no subscriptions, no surprises. You're always in control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-glass p-6 text-center">
              <div className="w-12 h-12 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign size={22} className="text-gold-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Pay Per Minute</h3>
              <p className="text-gray-400 text-sm">
                Only pay for the time you use. No fixed session lengths or packages required.
              </p>
            </div>

            <div className="card-glass p-6 text-center">
              <div className="w-12 h-12 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={22} className="text-primary-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">End Anytime</h3>
              <p className="text-gray-400 text-sm">
                You control the session. End your reading whenever you feel ready—no penalties.
              </p>
            </div>

            <div className="card-glass p-6 text-center">
              <div className="w-12 h-12 bg-gold-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={22} className="text-gold-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-400 text-sm">
                All transactions processed securely through Stripe. Your financial data is never stored on our servers.
              </p>
            </div>

            <div className="card-glass p-6 text-center">
              <div className="w-12 h-12 bg-primary-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={22} className="text-primary-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Fair to Readers</h3>
              <p className="text-gray-400 text-sm">
                Readers keep 70% of their earnings—because talented psychics deserve fair compensation.
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
                      When readers thrive, clients get better readings.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <DollarSign size={18} className="text-gold-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Pay Per Minute</h3>
                    <p className="text-gray-400 text-sm">
                      Only pay for the time you use. Add funds to your balance and spend as you go.
                      No subscriptions, no commitments.
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
                      Reader accounts are admin-approved only.
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
                      Whatever you're going through, you're safe here.
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
                Browse our readers, find the one that resonates with your soul, and begin
                your journey toward clarity.
              </p>
              <Link to="/readers" className="btn-primary w-full justify-center">
                Browse Our Readers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-dark-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400">
              Everything you need to know about SoulSeer
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} item={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-playfair text-white mb-4">
            Get in Touch
          </h2>
          <p className="text-gray-400 mb-8">
            Have questions? We'd love to hear from you.
          </p>
          <div className="card-glass p-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">General Support</h3>
                <a
                  href="mailto:support@soulseer.app"
                  className="text-primary-400 text-lg hover:text-primary-300 transition-colors"
                >
                  support@soulseer.app
                </a>
              </div>
              <div className="border-t border-primary-400/10 pt-4">
                <h3 className="text-white font-semibold mb-2">Become a Reader</h3>
                <p className="text-gray-400 text-sm mb-2">
                  Interested in joining our community of gifted psychics? Send us your
                  background and experience.
                </p>
                <a
                  href="mailto:readers@soulseer.app"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  readers@soulseer.app
                </a>
              </div>
              <div className="border-t border-primary-400/10 pt-4">
                <h3 className="text-white font-semibold mb-2">Business Inquiries</h3>
                <a
                  href="mailto:hello@soulseer.app"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  hello@soulseer.app
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
