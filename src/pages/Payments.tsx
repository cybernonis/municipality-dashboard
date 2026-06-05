import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle, Lock } from 'lucide-react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface PaymentType {
  key: string;
  label: string;
  icon: string;
}

interface PaymentStats {
  total_revenue: number;
  completed_payments: number;
  pending_payments: number;
}

// Checkout Form Component
const CheckoutForm: React.FC<{
  amount: number;
  paymentType: string;
  description: string;
  onSuccess: () => void;
}> = ({ amount, paymentType, description, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    try {
      // Δημιούργησε Payment Intent
      const { data } = await axios.post(`${API_URL}/payments/create-intent`, {
        amount,
        payment_type: paymentType,
        description,
        user_id: localStorage.getItem('user_id'),
      });

      // Επιβεβαίωσε πληρωμή
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        setError(result.error.message || 'Σφάλμα πληρωμής');
      } else {
        setSuccess(true);
        onSuccess();
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-4"><CheckCircle className="w-16 h-16 text-green-500" /></div>
      <p className="text-green-600 font-bold text-lg">Η πληρωμή ολοκληρώθηκε!</p>
      <p className="text-gray-500 mt-2">Ποσό: €{amount.toFixed(2)}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' },
            },
          },
        }} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !stripe}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? 'Επεξεργασία...' : `Πληρωμή €${amount.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-400 text-center">
        <Lock className="w-3 h-3 inline mr-1" />Ασφαλής πληρωμή μέσω Stripe
      </p>
    </div>
  );
};

const Payments: React.FC = () => {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [selectedType, setSelectedType] = useState<PaymentType | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [typesRes, statsRes] = await Promise.all([
      axios.get(`${API_URL}/payments/types`),
      axios.get(`${API_URL}/payments/stats`),
    ]);
    setPaymentTypes(typesRes.data);
    setStats(statsRes.data);
  };

  const handleSuccess = () => {
    setShowCheckout(false);
    setSelectedType(null);
    setAmount('');
    setDescription('');
    loadData();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">e-Πληρωμές</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
            <p className="text-3xl font-bold text-green-600">
              €{stats.total_revenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Συνολικά Έσοδα</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
            <p className="text-3xl font-bold text-blue-600">
              {stats.completed_payments}
            </p>
            <p className="text-sm text-gray-500">Ολοκληρωμένες</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-yellow-500">
            <p className="text-3xl font-bold text-yellow-600">
              {stats.pending_payments}
            </p>
            <p className="text-sm text-gray-500">Εκκρεμείς</p>
          </div>
        </div>
      )}

      {/* Payment Types Grid */}
      {!showCheckout && (
        <div>
          <h3 className="font-bold text-gray-800 mb-4">Επιλέξτε Τύπο Πληρωμής</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {paymentTypes.map(type => (
              <button
                key={type.key}
                onClick={() => setSelectedType(type)}
                className={`p-6 rounded-lg border-2 text-center transition-all hover:shadow-md ${
                  selectedType?.key === type.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-4xl mb-2">{type.icon}</div>
                <p className="font-medium text-gray-800 text-sm">{type.label}</p>
              </button>
            ))}
          </div>

          {/* Amount Form */}
          {selectedType && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4">
                {selectedType.icon} {selectedType.label}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ποσό (€)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.50"
                    step="0.01"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Περιγραφή (προαιρετικό)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="π.χ. Δημοτικά τέλη 2025..."
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={!amount || parseFloat(amount) < 0.5}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  Συνέχεια → Πληρωμή €{parseFloat(amount || '0').toFixed(2)}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checkout */}
      {showCheckout && selectedType && (
        <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
          <button
            onClick={() => setShowCheckout(false)}
            className="text-blue-600 text-sm mb-4 hover:underline"
          >
            ← Πίσω
          </button>

          <h3 className="font-bold text-gray-800 mb-2">
            {selectedType.icon} {selectedType.label}
          </h3>
          <p className="text-2xl font-bold text-blue-600 mb-6">
            €{parseFloat(amount).toFixed(2)}
          </p>

          {/* Test card info */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4 text-xs text-yellow-700">
            <p className="font-bold mb-1">Test Mode — Χρησιμοποίησε:</p>
            <p>Κάρτα: 4242 4242 4242 4242</p>
            <p>Ημ/νία: Οποιαδήποτε μελλοντική</p>
            <p>CVC: Οποιοδήποτε 3ψήφιο</p>
          </div>

          <Elements stripe={stripePromise}>
            <CheckoutForm
              amount={parseFloat(amount)}
              paymentType={selectedType.key}
              description={description}
              onSuccess={handleSuccess}
            />
          </Elements>
        </div>
      )}
    </div>
  );
};

export default Payments;