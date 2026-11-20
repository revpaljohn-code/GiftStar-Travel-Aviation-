import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BookingRecord, TourPackage } from '../types/travel';
import { GoogleSignInButton } from './GoogleSignInButton';

interface PortalAndAdminProps {
  user: User | null;
  isAdmin: boolean;
  workspaceToken: string | null;
  workspaceEmail: string | null;
  myBookings: BookingRecord[];
  allBookings: BookingRecord[];
  spreadsheetUrl: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onConnectWorkspace: () => Promise<void>;
  onSendEmailRequest: (booking: BookingRecord) => void;
  onCreateDocRequest: (booking: BookingRecord) => void;
  onDownloadPdfRequest: (booking: BookingRecord) => void;
  onSyncSheetsRequest: (bookingsToSync: BookingRecord[]) => void;
  onPackageCreated?: (pkg: TourPackage) => void;
  onOpenGoDaddyExport?: () => void;
}

const STATUS_BADGE_TEXT: Record<BookingRecord['status'], string> = {
  pending: 'Pending Review',
  confirmed: 'Confirmed',
  ticketed: 'Ticketed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PortalAndAdmin: React.FC<PortalAndAdminProps> = ({
  user,
  isAdmin,
  workspaceToken,
  workspaceEmail,
  myBookings,
  allBookings,
  spreadsheetUrl,
  onSignIn,
  onSignOut,
  onConnectWorkspace,
  onSendEmailRequest,
  onCreateDocRequest,
  onDownloadPdfRequest,
  onSyncSheetsRequest,
  onOpenGoDaddyExport,
}) => {
  const [activeTab, setActiveTab] = useState<'traveler' | 'admin'>('traveler');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Admin new package form
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgDest, setPkgDest] = useState('');
  const [pkgRegion, setPkgRegion] = useState('East Africa');
  const [pkgDays, setPkgDays] = useState(5);
  const [pkgPrice, setPkgPrice] = useState(1950);
  const [pkgTier, setPkgTier] = useState<'Signature' | 'Executive' | 'Bespoke'>('Signature');
  const [pkgSummary, setPkgSummary] = useState('');
  const [pkgHighlight, setPkgHighlight] = useState('Roundtrip partner airline ticketing & VIP transfer');
  const [pkgBusy, setPkgBusy] = useState(false);
  const [pkgMessage, setPkgMessage] = useState<string | null>(null);

  const handleCancelBooking = async (booking: BookingRecord) => {
    setBusyId(booking.id);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleAdminStatusChange = async (
    booking: BookingRecord,
    newStatus: BookingRecord['status']
  ) => {
    setBusyId(booking.id);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    setPkgBusy(true);
    setPkgMessage(null);
    const id = `pkg_${Date.now()}`;
    try {
      await setDoc(doc(db, 'packages', id), {
        title: pkgTitle.trim().slice(0, 140),
        destination: pkgDest.trim().slice(0, 100),
        region: pkgRegion.slice(0, 80),
        durationDays: Math.min(Math.max(Math.round(pkgDays), 1), 90),
        priceUsd: Math.max(0, Number(pkgPrice)),
        tier: pkgTier,
        summary: pkgSummary.trim().slice(0, 600),
        highlights: [pkgHighlight.trim().slice(0, 120) || 'Curated Giftstar Concierge'],
        active: true,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPkgTitle('');
      setPkgDest('');
      setPkgSummary('');
      setPkgMessage('Package published to the live Tour Packages catalog.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `packages/${id}`);
    } finally {
      setPkgBusy(false);
    }
  };

  const visibleBookings = activeTab === 'admin' && isAdmin ? allBookings : myBookings;

  return (
    <section id="portal" className="py-20 bg-[#F4F6FA] border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
              Traveler Account, Dispatch & Google Workspace
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight">
              Reservations & Aviation Operations Portal
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Manage your active bookings, generate downloadable Google Docs itineraries, dispatch Gmail confirmations, and synchronize records to Google Sheets.
            </p>
          </div>

          {user && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-[#0B1F3A]">{user.displayName || user.email}</p>
                <p className="text-[11px] text-slate-500">
                  {isAdmin ? 'Agency Administrator' : 'Verified Traveler'}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {!user ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-semibold text-[#0B1F3A] mb-2">
                Sign in to access your bookings & Workspace tools
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Authenticate with your Google account to view reservation status, download Google Docs itineraries, send booking confirmations via Gmail, or open the Giftstar Admin Dashboard.
              </p>
            </div>
            <GoogleSignInButton onClick={onSignIn} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Workspace Connection & Mode Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('traveler')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'traveler'
                      ? 'bg-[#0B1F3A] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  My Bookings ({myBookings.length})
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'admin'
                        ? 'bg-[#0D74CE] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Dashboard ({allBookings.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {workspaceToken ? (
                  <>
                    <span className="text-xs text-slate-600">
                      Workspace Connected: <strong className="text-[#0B1F3A]">{workspaceEmail || user.email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSyncSheetsRequest(visibleBookings)}
                      disabled={visibleBookings.length === 0}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-[#0D74CE] rounded-lg hover:bg-[#095ca6] inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Sync to Google Sheets
                    </button>
                    {spreadsheetUrl && (
                      <a
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-xs font-medium text-[#0D74CE] bg-[#0D74CE]/10 rounded-lg hover:bg-[#0D74CE]/15 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        Open Sheet
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Connect Gmail, Google Docs & Sheets:
                    </span>
                    <GoogleSignInButton
                      label="Connect Google Workspace"
                      onClick={onConnectWorkspace}
                    />
                  </div>
                )}
                {onOpenGoDaddyExport && (
                  <button
                    type="button"
                    onClick={onOpenGoDaddyExport}
                    className="px-3.5 py-2 text-xs font-medium text-[#0B1F3A] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#0D74CE]" />
                    Copy to GoDaddy
                  </button>
                )}
              </div>
            </div>

            {/* Bookings Ledger Table / Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-[#0B1F3A]">
                  {activeTab === 'admin' && isAdmin
                    ? 'All Customer Bookings & Dispatch Ledger'
                    : 'Your Travel Reservations'}
                </h3>
                <span className="text-xs font-mono-tabular text-slate-500">
                  {visibleBookings.length} record(s)
                </span>
              </div>

              {visibleBookings.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No reservations recorded yet. Select any destination, tour package, flight, or AI itinerary above to create a booking.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {visibleBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono-tabular font-semibold text-[#0B1F3A]">
                            {bk.bookingRef}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-medium ${
                              bk.status === 'confirmed' || bk.status === 'ticketed'
                                ? 'text-emerald-700'
                                : bk.status === 'cancelled'
                                  ? 'text-red-700'
                                  : 'text-[#0D74CE]'
                            }`}
                          >
                            {STATUS_BADGE_TEXT[bk.status]}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{bk.cabinOrTier}</span>
                        </div>

                        <h4 className="font-display text-lg font-semibold text-[#0B1F3A]">
                          {bk.itemTitle}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span>Traveler: {bk.customerName} ({bk.customerEmail})</span>
                          <span className="font-mono-tabular">Departure: {bk.travelDate}</span>
                          <span className="font-mono-tabular">Guests: {bk.guests}</span>
                          <span className="font-mono-tabular font-semibold text-[#0B1F3A]">
                            ${bk.totalUsd.toLocaleString()} USD
                          </span>
                        </div>
                        {bk.notes && (
                          <p className="text-xs text-slate-500 pt-1">Note: {bk.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSendEmailRequest(bk)}
                          className="px-3 py-1.5 text-xs font-medium text-[#0B1F3A] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#0D74CE]" />
                          {bk.emailSent ? 'Resend Gmail' : 'Send Gmail'}
                        </button>

                        {bk.googleDocUrl ? (
                          <>
                            <a
                              href={bk.googleDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-medium text-[#0D74CE] bg-[#0D74CE]/10 rounded-lg hover:bg-[#0D74CE]/15 inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Open Doc
                            </a>
                            <button
                              type="button"
                              onClick={() => onDownloadPdfRequest(bk)}
                              className="px-3 py-1.5 text-xs font-medium text-[#0B1F3A] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCreateDocRequest(bk)}
                            className="px-3 py-1.5 text-xs font-medium text-[#0B1F3A] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#0D74CE]" />
                            Create Doc
                          </button>
                        )}

                        {activeTab === 'admin' && isAdmin ? (
                          <select
                            aria-label={`Update status for ${bk.bookingRef}`}
                            value={bk.status}
                            disabled={busyId === bk.id}
                            onChange={(e) =>
                              handleAdminStatusChange(bk, e.target.value as BookingRecord['status'])
                            }
                            className="px-2.5 py-1.5 text-xs font-medium bg-[#FAFBFD] border border-slate-200 rounded-lg text-[#0B1F3A]"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="ticketed">Ticketed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          bk.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === bk.id}
                              onClick={() => handleCancelBooking(bk)}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Package Publisher */}
            {activeTab === 'admin' && isAdmin && (
              <form
                onSubmit={handleCreatePackage}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Plus className="w-4 h-4 text-[#0D74CE]" />
                  <h3 className="font-display text-xl font-semibold text-[#0B1F3A]">
                    Publish New Curated Tour Package
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="adm-title" className="block text-xs font-medium text-slate-600 mb-1">
                      Package Title
                    </label>
                    <input
                      id="adm-title"
                      type="text"
                      required
                      minLength={3}
                      value={pkgTitle}
                      onChange={(e) => setPkgTitle(e.target.value)}
                      placeholder="e.g., Zanzibar & Serengeti Dual Escape"
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-dest" className="block text-xs font-medium text-slate-600 mb-1">
                      Destination
                    </label>
                    <input
                      id="adm-dest"
                      type="text"
                      required
                      value={pkgDest}
                      onChange={(e) => setPkgDest(e.target.value)}
                      placeholder="Zanzibar, Tanzania"
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-region" className="block text-xs font-medium text-slate-600 mb-1">
                      Region
                    </label>
                    <select
                      id="adm-region"
                      value={pkgRegion}
                      onChange={(e) => setPkgRegion(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    >
                      <option value="East Africa">East Africa</option>
                      <option value="Middle East">Middle East</option>
                      <option value="Mediterranean">Mediterranean</option>
                      <option value="Indian Ocean">Indian Ocean</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="adm-days" className="block text-xs font-medium text-slate-600 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      id="adm-days"
                      type="number"
                      min={1}
                      max={90}
                      value={pkgDays}
                      onChange={(e) => setPkgDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-price" className="block text-xs font-medium text-slate-600 mb-1">
                      Price (USD)
                    </label>
                    <input
                      id="adm-price"
                      type="number"
                      min={100}
                      value={pkgPrice}
                      onChange={(e) => setPkgPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-tier" className="block text-xs font-medium text-slate-600 mb-1">
                      Tier
                    </label>
                    <select
                      id="adm-tier"
                      value={pkgTier}
                      onChange={(e) => setPkgTier(e.target.value as TourPackage['tier'])}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    >
                      <option value="Signature">Signature</option>
                      <option value="Executive">Executive</option>
                      <option value="Bespoke">Bespoke</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="adm-highlight" className="block text-xs font-medium text-slate-600 mb-1">
                      Key Inclusion
                    </label>
                    <input
                      id="adm-highlight"
                      type="text"
                      required
                      value={pkgHighlight}
                      onChange={(e) => setPkgHighlight(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="adm-summary" className="block text-xs font-medium text-slate-600 mb-1">
                    Package Overview
                  </label>
                  <textarea
                    id="adm-summary"
                    rows={2}
                    required
                    minLength={10}
                    value={pkgSummary}
                    onChange={(e) => setPkgSummary(e.target.value)}
                    placeholder="Describe flight corridors, accommodation standard, visa support, and excursions..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-emerald-700">{pkgMessage || ''}</p>
                  <button
                    type="submit"
                    disabled={pkgBusy}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1F3A] rounded-xl hover:bg-[#132f57] disabled:opacity-60"
                  >
                    {pkgBusy ? 'Publishing...' : 'Publish Package'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
