'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      fetchSubscriberData();
    } else {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Please use the link from your email.');
    }
  }, [token]);

  const fetchSubscriberData = async () => {
    try {
      const response = await fetch(`/api/newsletter/unsubscribe?token=${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          setStatus('error');
          setMessage('Invalid or expired unsubscribe link. Please use the link from your email.');
        } else {
          throw new Error('Failed to fetch subscriber data');
        }
        return;
      }

      const data = await response.json();
      if (!data) {
        setStatus('error');
        setMessage('Subscriber not found. Please use the link from your email.');
        return;
      }

      setEmail(data.email);
      if (!data.isSubscribed) {
        setStatus('success');
        setMessage('You are already unsubscribed from our newsletter.');
      } else {
        setStatus('ready');
      }
    } catch (error) {
      console.error('Error fetching subscriber data:', error);
      setStatus('error');
      setMessage('Failed to load unsubscribe page. Please try again later.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reason,
          feedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus('error');
        setMessage(errorData.error || 'Failed to unsubscribe');
        return;
      }

      setStatus('success');
      setMessage('You have been successfully unsubscribed from our newsletter.');
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      setStatus('error');
      setMessage('Failed to process unsubscribe. Please try again later.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Loading...</h1>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-white">Error</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg text-center"
        >
          <h1 className="text-2xl font-bold text-white mb-4">Unsubscribed</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;re sorry to see you go. If you change your mind, you can always resubscribe by visiting our newsletter page.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Return to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-8 rounded-lg shadow-lg"
        >
          <h1 className="text-2xl font-bold text-white mb-2">Unsubscribe from Newsletter</h1>
          <p className="text-gray-400 text-sm mb-6">
            We&apos;re sorry to see you go. Your feedback helps us improve.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for unsubscribing (optional)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a reason...</option>
                <option value="too_frequent">Too frequent emails</option>
                <option value="not_relevant">Content not relevant</option>
                <option value="no_longer_interested">No longer interested</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional feedback (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tell us how we can improve..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {status === 'submitting' ? 'Unsubscribing...' : 'Unsubscribe'}
              </button>
              <Link
                href="/"
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Loading...</h1>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
