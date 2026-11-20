import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BookingRecord } from '../types/travel';
import { GoogleSignInButton } from './GoogleSignInButton';

export interface BookingDraft {
  bookingType: 'package' | 'flight' | 'hotel' | 'custom_itinerary';
  itemId: string;
  itemTitle: string;
  destination: string;
  unitPriceUsd: number;
  defaultGuests?: number;
  cabinOrTier?: string;
  notes?: string;
}

interface BookingModalProps {
  draft: BookingDraft | null;
  user: User | null;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onCreated: (booking: BookingRecord) => void;
}

function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GSA-${suffix}`;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  draft,
  user,
  onClose,
  onSignIn,
  onCreated,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+211 ');
  const [travelDate, setTravelDate] = useState('2026-12-15');
  const [returnDate, setReturnDate] = useState('2026-12-22');
  const [guests, setGuests] = useState(1);
  const [cabinOrTier, setCabinOrTier] = useState('Executive Economy');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (draft) {
      setGuests(draft.defaultGuests || 1);
      setCabinOrTier(draft.cabinOrTier || 'Executive Economy');
      setNotes(draft.notes || '');
      setCreatedBooking(null);
      setError(null);
    }
  }, [draft]);

  useEffect(() => {
    if (user) {
      if (!customerName && user.displayName) setCustomerName(user.displayName);
      if (!customerEmail && user.email) setCustomerEmail(user.email);
    }
  }, [user, customerName, customerEmail]);

  if (!draft) return null;

  const multiplier =
    cabinOrTier === 'Business / Private Suite' ? 2.1 : cabinOrTier === 'Signature First / Charter' ? 3.0 : 1;
  const computedTotal = Math.round(draft.unitPriceUsd * Math.max(1, guests) * multiplier);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const trimmedName = customerName.trim().slice(0, 120);
    const trimmedEmail = customerEmail.trim().slice(0, 200);
    const trimmedPhone = customerPhone.trim().slice(0, 40);

    if (trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      setError('Please enter a valid email address.');
      return;
    }
    if (trimmedPhone.length < 5) {
      setError('Please enter a valid contact phone number.');
      return;
    }

    setSubmitting(true);
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const bookingRef = generateBookingRef();

    const payload = {
      bookingRef,
      userId: user.uid,
      customerName: trimmedName,
      customerEmail: trimmedEmail,
      customerPhone: trimmedPhone,
      bookingType: draft.bookingType,
      itemId: draft.itemId.slice(0, 128),
      itemTitle: draft.itemTitle.slice(0, 160),
      destination: draft.destination.slice(0, 120),
      travelDate: travelDate.slice(0, 32),
      ...(returnDate ? { returnDate: returnDate.slice(0, 32) } : {}),
      guests: Math.min(Math.max(Math.round(guests), 1), 50),
      cabinOrTier: cabinOrTier.slice(0, 60),
      totalUsd: computedTotal,
      status: 'pending' as const,
      ...(notes.trim() ? { notes: notes.trim().slice(0, 1000) } : {}),
      sheetSynced: false,
      emailSent: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'bookings', bookingId), payload);
      const record: BookingRecord = {
        ...payload,
        id: bookingId,
      };
      setCreatedBooking(record);
      onCreated(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit booking.');
      handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1F3A]/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
          <div>
            <p className="text-xs font-medium text-[#0D74CE] mb-1">
              Giftstar Reservation Desk · {draft.destination}
            </p>
            <h3 className="font-display text-2xl font-semibold text-[#0B1F3A]">
              {draft.itemTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#0B1F3A] rounded-lg"
            aria-label="Close booking dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdBooking ? (
          <div className="py-4 space-y-5">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Booking Request Registered ({createdBooking.bookingRef})
                </p>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Your reservation is saved in your Traveler Portal. From the portal below you can generate a Google Doc itinerary, download a PDF copy, or send your confirmation via Gmail.
                </p>
              </div>
            </div>

            <div className="bg-[#FAFBFD] border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Traveler</p>
                <p className="font-semibold text-[#0B1F3A]">{createdBooking.customerName}</p>
              </div>
              <div>
                <p className="text-slate-500">Departure</p>
                <p className="font-mono-tabular font-semibold text-[#0B1F3A]">
                  {createdBooking.travelDate}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Cabin / Tier</p>
                <p className="font-semibold text-[#0B1F3A]">{createdBooking.cabinOrTier}</p>
              </div>
              <div>
                <p className="text-slate-500">Estimated Total</p>
                <p className="font-mono-tabular font-semibold text-[#0D74CE]">
                  ${createdBooking.totalUsd.toLocaleString()} USD
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#0B1F3A] text-white text-sm font-medium rounded-xl hover:bg-[#132f57] transition-colors"
              >
                View in Portal
              </button>
            </div>
          </div>
        ) : !user ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Sign in with Google to bind this reservation securely to your traveler account, track ticket status, and receive Workspace documents.
            </p>
            <div className="flex justify-center">
              <GoogleSignInButton onClick={onSignIn} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-name" className="block text-xs font-medium text-slate-600 mb-1">
                  Lead Traveler Full Name
                </label>
                <input
                  id="bk-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                />
              </div>
              <div>
                <label htmlFor="bk-email" className="block text-xs font-medium text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  id="bk-email"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="bk-phone" className="block text-xs font-medium text-slate-600 mb-1">
                  WhatsApp / Phone
                </label>
                <input
                  id="bk-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                />
              </div>
              <div>
                <label htmlFor="bk-depart" className="block text-xs font-medium text-slate-600 mb-1">
                  Departure Date
                </label>
                <input
                  id="bk-depart"
                  type="date"
                  required
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                />
              </div>
              <div>
                <label htmlFor="bk-return" className="block text-xs font-medium text-slate-600 mb-1">
                  Return Date
                </label>
                <input
                  id="bk-return"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-guests" className="block text-xs font-medium text-slate-600 mb-1">
                  Number of Travelers
                </label>
                <input
                  id="bk-guests"
                  type="number"
                  min={1}
                  max={50}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                />
              </div>
              <div>
                <label htmlFor="bk-tier" className="block text-xs font-medium text-slate-600 mb-1">
                  Cabin / Service Tier
                </label>
                <select
                  id="bk-tier"
                  value={cabinOrTier}
                  onChange={(e) => setCabinOrTier(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
                >
                  <option value="Executive Economy">Executive Economy</option>
                  <option value="Business / Private Suite">Business / Private Suite</option>
                  <option value="Signature First / Charter">Signature First / Charter</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bk-notes" className="block text-xs font-medium text-slate-600 mb-1">
                Visa, Airport Transfer or Special Requests
              </label>
              <textarea
                id="bk-notes"
                rows={3}
                maxLength={900}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., UAE 30-day visa needed, airport pickup at JUB, window seat preference..."
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
              />
            </div>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Estimated Total</p>
                <p className="font-mono-tabular text-xl font-semibold text-[#0B1F3A]">
                  ${computedTotal.toLocaleString()} USD
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0D74CE] rounded-xl hover:bg-[#095ca6] transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
