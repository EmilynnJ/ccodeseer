import { useState } from 'react';
import { DollarSign, CreditCard, Plus, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const amounts = [10, 25, 50, 100, 200, 500];

function AddFundsForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { updateBalance, clientProfile } = useAuthStore();
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (amount < 5) {
      toast.error('Minimum amount is $5');
      return;
    }

    if (amount > 500) {
      toast.error('Maximum amount is $500');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await api.addFunds(amount);
      const { clientSecret } = response.data.data;

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        toast.success(`$${amount.toFixed(2)} added to your balance!`);
        updateBalance(Number(clientProfile?.balance || 0) + amount);
        setCustomAmount('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Selection */}
      <div>
        <label className="label">Select Amount</label>
        <div className="grid grid-cols-3 gap-3">
          {amounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setSelectedAmount(amt);
                setCustomAmount('');
              }}
              className={`p-4 rounded-lg border transition-all ${
                selectedAmount === amt && !customAmount
                  ? 'bg-primary-400/20 border-primary-400 text-primary-400'
                  : 'bg-dark-700 border-transparent text-gray-300 hover:border-primary-400/30'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <label className="label">Or Enter Custom Amount</label>
        <div className="relative">
          <DollarSign
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="number"
            min="5"
            max="500"
            step="0.01"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Enter amount"
            className="input pl-10"
          />
        </div>
      </div>

      {/* Card Input */}
      <div>
        <label className="label">Card Details</label>
        <div className="bg-dark-700 border border-primary-400/20 rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="spinner" />
            Processing...
          </>
        ) : (
          <>
            <Plus size={20} />
            Add ${amount.toFixed(2)}
          </>
        )}
      </button>
    </form>
  );
}

export default function Wallet() {
  const { clientProfile } = useAuthStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair text-white mb-2">Wallet</h1>
        <p className="text-gray-400">Manage your balance and payment methods.</p>
      </div>

      {/* Current Balance */}
      <div className="card p-8 bg-gradient-to-r from-primary-900/30 to-gold-900/30">
        <p className="text-gray-300 mb-2">Current Balance</p>
        <p className="text-5xl font-bold text-white mb-4">
          ${Number(clientProfile?.balance || 0).toFixed(2)}
        </p>
        <p className="text-gray-400 text-sm">
          Your balance is used for pay-per-minute readings and shop purchases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Funds */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Plus size={20} className="text-primary-400" />
            Add Funds
          </h2>

          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <AddFundsForm />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">
                Payment system not configured. Please add your Stripe key.
              </p>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="space-y-6">
          {/* Auto-reload */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary-400" />
              Auto-Reload
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Automatically add funds when your balance drops below a threshold.
            </p>
            <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
              <span className="text-gray-300">Auto-reload enabled</span>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${
                  clientProfile?.autoReloadEnabled
                    ? 'bg-primary-400'
                    : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    clientProfile?.autoReloadEnabled
                      ? 'translate-x-6'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Payment Security */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Payment Security
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Check size={18} className="text-green-400" />
                <span>256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Check size={18} className="text-green-400" />
                <span>PCI-DSS compliant</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Check size={18} className="text-green-400" />
                <span>Powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
