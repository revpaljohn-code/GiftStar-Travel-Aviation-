import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Star } from 'lucide-react';
import { INITIAL_REVIEWS } from '../data/catalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CustomerReview } from '../types/travel';
import { GoogleSignInButton } from './GoogleSignInButton';

interface ReviewsSectionProps {
  reviews: CustomerReview[];
  user: User | null;
  onSignIn: () => Promise<void>;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews, user, onSignIn }) => {
  const [authorRole, setAuthorRole] = useState('');
  const [routeOrPackage, setRouteOrPackage] = useState('Juba → Dubai Executive Flight');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const displayedReviews = reviews.length > 0 ? [...reviews, ...INITIAL_REVIEWS] : INITIAL_REVIEWS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setSubmittedMsg(null);

    if (comment.trim().length < 10) {
      setFormError('Please share at least 10 characters about your travel experience.');
      return;
    }

    setSubmitting(true);
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'reviews', id), {
        userId: user.uid,
        authorName: (user.displayName || user.email?.split('@')[0] || 'Verified Traveler').slice(0, 100),
        ...(authorRole.trim() ? { authorRole: authorRole.trim().slice(0, 100) } : {}),
        routeOrPackage: routeOrPackage.trim().slice(0, 140),
        rating: Math.min(Math.max(Math.round(rating), 1), 5),
        comment: comment.trim().slice(0, 1200),
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setComment('');
      setAuthorRole('');
      setSubmittedMsg('Thank you — your verified review is now published.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to publish review.');
      handleFirestoreError(err, OperationType.CREATE, `reviews/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="py-20 bg-[#FAFBFD] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
              Traveler Verification & Proof
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight">
              Trusted by Delegations, Executives & Families
            </h2>
          </div>
          <div className="text-sm text-slate-600 font-mono-tabular">
            4.9 / 5.0 average across regional & international corridors
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedReviews.slice(0, 4).map((rev) => (
              <article
                key={rev.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-3.5 h-3.5 fill-[#C8923A] text-[#C8923A]"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500">{rev.routeOrPackage}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-5">“{rev.comment}”</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-[#0B1F3A]">{rev.authorName}</p>
                  {rev.authorRole && (
                    <p className="text-xs text-slate-500 mt-0.5">{rev.authorRole}</p>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-display text-xl font-semibold text-[#0B1F3A] mb-2">
              Share Your Journey Review
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Verified travelers can publish route feedback directly to our live client ledger.
            </p>

            {!user ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Sign in with Google to leave a verified review.
                </p>
                <GoogleSignInButton onClick={onSignIn} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="rev-route" className="block text-xs font-medium text-slate-600 mb-1">
                    Route or Package
                  </label>
                  <input
                    id="rev-route"
                    type="text"
                    required
                    value={routeOrPackage}
                    onChange={(e) => setRouteOrPackage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rev-role" className="block text-xs font-medium text-slate-600 mb-1">
                      Title / Org (optional)
                    </label>
                    <input
                      id="rev-role"
                      type="text"
                      value={authorRole}
                      onChange={(e) => setAuthorRole(e.target.value)}
                      placeholder="Traveler"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="rev-rating" className="block text-xs font-medium text-slate-600 mb-1">
                      Rating
                    </label>
                    <select
                      id="rev-rating"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="rev-comment" className="block text-xs font-medium text-slate-600 mb-1">
                    Your Experience
                  </label>
                  <textarea
                    id="rev-comment"
                    rows={3}
                    required
                    minLength={10}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share how our ticketing, visa, or safari desk supported your trip..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                {formError && <p className="text-xs text-red-600">{formError}</p>}
                {submittedMsg && <p className="text-xs text-emerald-700">{submittedMsg}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#0B1F3A] text-white text-xs font-semibold rounded-xl hover:bg-[#132f57] disabled:opacity-60"
                >
                  {submitting ? 'Publishing...' : 'Publish Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
