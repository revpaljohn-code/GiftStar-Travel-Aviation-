import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  Plane,
  Star,
} from 'lucide-react';
import { AiTripPlanner } from './components/AiTripPlanner';
import { BillboardGallery } from './components/BillboardGallery';
import { BookingDraft, BookingModal } from './components/BookingModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DestinationDetailModal } from './components/DestinationDetailModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoDaddyExportModal } from './components/GoDaddyExportModal';
import { GoogleMapsExplorer } from './components/GoogleMapsExplorer';
import { PortalAndAdmin } from './components/PortalAndAdmin';
import { ReviewsSection } from './components/ReviewsSection';
import {
  AGENCY_BRAND_LOGO,
  CORE_SERVICES,
  DESTINATIONS,
  FLIGHT_ROUTES,
  HERO_AVIATION_IMAGE,
  HOTEL_LISTINGS,
  PARTNER_AIRLINES,
  TOUR_PACKAGES,
} from './data/catalog';
import {
  auth,
  connectGoogleWorkspace,
  db,
  getWorkspaceAccessToken,
  handleFirestoreError,
  initWorkspaceAuth,
  isAdminUser,
  OperationType,
  signInWithGoogleTraveler,
  signOutTraveler,
} from './lib/firebase';
import {
  createItineraryGoogleDoc,
  exportGoogleDocAsPdf,
  sendBookingConfirmationEmail,
  syncBookingsToGoogleSheet,
} from './lib/workspaceApi';
import {
  BookingRecord,
  CustomerReview,
  DestinationItem,
  GeneratedItinerary,
  TourPackage,
} from './types/travel';

interface PendingWorkspaceAction {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  execute: (token: string) => Promise<void>;
}

export default function App() {
  // Google Maps API key + Demo Key Quota Banner state
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Auth & Workspace state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);
  const [workspaceEmail, setWorkspaceEmail] = useState<string | null>(null);

  // Catalog & Interactive selections
  const [selectedMapDest, setSelectedMapDest] = useState<DestinationItem>(DESTINATIONS[0]);
  const [activeDestModal, setActiveDestModal] = useState<DestinationItem | null>(null);
  const [packageTierFilter, setPackageTierFilter] = useState<'All' | 'Signature' | 'Executive' | 'Bespoke'>('All');
  const [aviationTab, setAviationTab] = useState<'flights' | 'hotels'>('flights');
  const [flightTypeFilter, setFlightTypeFilter] = useState<'All' | 'Scheduled' | 'Air Charter'>('All');
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);

  // Firestore synced collections
  const [firestorePackages, setFirestorePackages] = useState<TourPackage[]>([]);
  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);

  // Google Workspace operational state
  const [spreadsheetId, setSpreadsheetId] = useState<string | undefined>(undefined);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingWorkspaceAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [goDaddyModalOpen, setGoDaddyModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const admin = isAdminUser(user);

  // Maps API key fallback fetch if Vite env var was not inlined
  useEffect(() => {
    if (!mapsApiKey) {
      fetch('/api/maps/key')
        .then((r) => r.json())
        .then((d) => {
          if (d?.apiKey) setMapsApiKey(d.apiKey);
        })
        .catch(() => undefined);
    }
  }, [mapsApiKey]);

  // Tier 1 + 2 Maps Quota listener
  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Auth listeners
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    const unsubWs = initWorkspaceAuth(
      (wsUser, token) => {
        setWorkspaceToken(token);
        setWorkspaceEmail(wsUser.email);
      },
      () => {
        setWorkspaceToken(null);
        setWorkspaceEmail(null);
      }
    );
    return () => {
      unsub();
      unsubWs();
    };
  }, []);

  // Public Firestore listeners (published reviews & active packages)
  useEffect(() => {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('status', '==', 'published')
    );
    const unsubReviews = onSnapshot(
      reviewsQuery,
      (snap) => {
        const list: CustomerReview[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CustomerReview, 'id'>),
        }));
        setReviews(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'reviews')
    );

    const packagesQuery = query(
      collection(db, 'packages'),
      where('active', '==', true)
    );
    const unsubPackages = onSnapshot(
      packagesQuery,
      (snap) => {
        const list: TourPackage[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TourPackage, 'id'>),
          image: '/src/assets/images/dest_serengeti_safari_1795194061883.jpg',
          isFirestore: true,
        }));
        setFirestorePackages(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'packages')
    );

    return () => {
      unsubReviews();
      unsubPackages();
    };
  }, []);

  // Authenticated Firestore listeners (bookings)
  useEffect(() => {
    if (!authReady || !user) {
      setMyBookings([]);
      setAllBookings([]);
      return;
    }

    const myQ = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsubMy = onSnapshot(
      myQ,
      (snap) => {
        const list: BookingRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BookingRecord, 'id'>),
        }));
        setMyBookings(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bookings')
    );

    let unsubAll = () => {};
    if (admin) {
      const allQ = query(collection(db, 'bookings'));
      unsubAll = onSnapshot(
        allQ,
        (snap) => {
          const list: BookingRecord[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BookingRecord, 'id'>),
          }));
          setAllBookings(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'bookings')
      );
    }

    return () => {
      unsubMy();
      unsubAll();
    };
  }, [authReady, user, admin]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogleTraveler();
      showToast('success', 'Signed in to Giftstar Travel Aviation.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Sign-in cancelled or failed.');
    }
  };

  const handleConnectWorkspace = async () => {
    try {
      const res = await connectGoogleWorkspace();
      setWorkspaceToken(res.accessToken);
      setWorkspaceEmail(res.user.email);
      showToast('success', 'Google Workspace connected (Gmail, Docs, Sheets & Drive).');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Google Workspace connection cancelled.');
    }
  };

  const ensureWorkspaceTokenAndConfirm = async (action: PendingWorkspaceAction) => {
    let token = getWorkspaceAccessToken() || workspaceToken;
    if (!token) {
      try {
        const res = await connectGoogleWorkspace();
        token = res.accessToken;
        setWorkspaceToken(res.accessToken);
        setWorkspaceEmail(res.user.email);
      } catch (err) {
        showToast(
          'error',
          err instanceof Error
            ? err.message
            : 'Please connect Google Workspace to perform this action.'
        );
        return;
      }
    }
    setConfirmAction(action);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const token = getWorkspaceAccessToken() || workspaceToken;
    if (!token) {
      setConfirmAction(null);
      return;
    }

    setConfirmBusy(true);
    try {
      await confirmAction.execute(token);
      setConfirmAction(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Workspace operation failed.');
    } finally {
      setConfirmBusy(false);
    }
  };

  // Workspace Action Handlers (always guarded by ConfirmDialog!)
  const handleSendEmailRequest = (booking: BookingRecord) => {
    void ensureWorkspaceTokenAndConfirm({
      title: 'Send Confirmation Email via Gmail?',
      description:
        'Giftstar will send a formal booking confirmation email from your connected Gmail account.',
      details: [
        `Recipient: ${booking.customerName} <${booking.customerEmail}>`,
        `Subject: Giftstar Travel Aviation Confirmation — ${booking.bookingRef}`,
        `Itinerary: ${booking.itemTitle} (${booking.travelDate})`,
      ],
      confirmLabel: 'Send Gmail Confirmation',
      execute: async (token) => {
        await sendBookingConfirmationEmail(token, {
          toEmail: booking.customerEmail,
          toName: booking.customerName,
          subject: `Giftstar Travel Aviation Confirmation — ${booking.bookingRef}`,
          bookingRef: booking.bookingRef,
          itemTitle: booking.itemTitle,
          destination: booking.destination,
          travelDate: booking.travelDate,
          guests: booking.guests,
          totalUsd: booking.totalUsd,
          googleDocUrl: booking.googleDocUrl,
        });
        await updateDoc(doc(db, 'bookings', booking.id), {
          emailSent: true,
          updatedAt: serverTimestamp(),
        });
        showToast('success', `Confirmation email sent to ${booking.customerEmail} via Gmail.`);
      },
    });
  };

  const handleCreateDocRequest = (booking: BookingRecord) => {
    void ensureWorkspaceTokenAndConfirm({
      title: 'Create Itinerary in Google Docs?',
      description:
        'A formatted travel itinerary document will be created in your Google Drive and linked to this reservation.',
      details: [
        `Document Title: Giftstar Itinerary — ${booking.itemTitle}`,
        `Traveler: ${booking.customerName} (${booking.bookingRef})`,
        `Destination: ${booking.destination}`,
      ],
      confirmLabel: 'Generate Google Doc',
      execute: async (token) => {
        const result = await createItineraryGoogleDoc(token, {
          title: `${booking.itemTitle} (${booking.bookingRef})`,
          travelerName: booking.customerName,
          bookingRef: booking.bookingRef,
          destination: booking.destination,
          travelDate: booking.travelDate,
          summaryText: `Reservation: ${booking.itemTitle}\nCabin / Tier: ${booking.cabinOrTier}\nTravelers: ${booking.guests}\nEstimated Total: $${booking.totalUsd.toLocaleString()} USD\nStatus: ${booking.status.toUpperCase()}\n${booking.notes ? `Notes: ${booking.notes}` : ''}`,
        });
        await updateDoc(doc(db, 'bookings', booking.id), {
          googleDocId: result.documentId,
          googleDocUrl: result.documentUrl,
          updatedAt: serverTimestamp(),
        });
        showToast('success', 'Google Doc itinerary generated and linked to your booking.');
      },
    });
  };

  const handleDownloadPdfRequest = (booking: BookingRecord) => {
    if (!booking.googleDocId) return;
    void ensureWorkspaceTokenAndConfirm({
      title: 'Export Itinerary as PDF?',
      description:
        'Download a PDF copy of your generated Google Docs itinerary directly to your device.',
      details: [
        `Booking Reference: ${booking.bookingRef}`,
        `Document ID: ${booking.googleDocId}`,
      ],
      confirmLabel: 'Download PDF',
      execute: async (token) => {
        await exportGoogleDocAsPdf(
          token,
          booking.googleDocId!,
          `Giftstar_${booking.bookingRef}_Itinerary`
        );
        showToast('success', 'PDF itinerary downloaded.');
      },
    });
  };

  const handleExportAiItineraryDoc = (itinerary: GeneratedItinerary, destination: string) => {
    void ensureWorkspaceTokenAndConfirm({
      title: 'Create AI Itinerary in Google Docs & Download PDF?',
      description:
        'Giftstar will build a formatted Google Doc containing your full AI day-by-day schedule, airline routing, and budget breakdown, and download a PDF copy.',
      details: [
        `Document Title: Giftstar Itinerary — ${itinerary.title}`,
        `Destination: ${destination}`,
        `Days Included: ${itinerary.days.length} days`,
      ],
      confirmLabel: 'Create Doc & Download PDF',
      execute: async (token) => {
        const docResult = await createItineraryGoogleDoc(token, {
          title: itinerary.title,
          travelerName: user?.displayName || 'Giftstar Traveler',
          destination,
          itinerary,
        });
        await exportGoogleDocAsPdf(token, docResult.documentId, `Giftstar_${destination}_Plan`);
        showToast('success', 'Google Doc created and PDF itinerary downloaded.');
      },
    });
  };

  const handleSyncSheetsRequest = (bookingsToSync: BookingRecord[]) => {
    void ensureWorkspaceTokenAndConfirm({
      title: spreadsheetId
        ? 'Update Bookings Ledger in Google Sheets?'
        : 'Create & Sync Bookings Ledger in Google Sheets?',
      description: spreadsheetId
        ? `Overwrite the existing Giftstar Bookings spreadsheet with ${bookingsToSync.length} current booking record(s).`
        : `Create a new Google Sheet named "Giftstar Travel Aviation — Bookings & Customer Records" with ${bookingsToSync.length} record(s).`,
      details: [
        `Records to sync: ${bookingsToSync.length} booking(s)`,
        'Columns: Booking Ref, Status, Customer, Contact, Itinerary, Dates, Total USD, Doc URL',
      ],
      confirmLabel: spreadsheetId ? 'Update Google Sheet' : 'Create Google Sheet',
      execute: async (token) => {
        const res = await syncBookingsToGoogleSheet(token, bookingsToSync, spreadsheetId);
        setSpreadsheetId(res.spreadsheetId);
        setSpreadsheetUrl(res.spreadsheetUrl);
        showToast('success', `Synced ${res.rowCount} booking record(s) to Google Sheets.`);
      },
    });
  };

  const mergedPackages = useMemo(() => {
    const all = [...firestorePackages, ...TOUR_PACKAGES];
    if (packageTierFilter === 'All') return all;
    return all.filter((p) => p.tier === packageTierFilter);
  }, [firestorePackages, packageTierFilter]);

  const filteredFlights = useMemo(() => {
    if (flightTypeFilter === 'All') return FLIGHT_ROUTES;
    return FLIGHT_ROUTES.filter((f) => f.type === flightTypeFilter);
  }, [flightTypeFilter]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-[#0B1F3A]">
        {/* Mandatory Google Maps Demo Key Quota Banner */}
        {mapsQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Strict 3-Zone Top Navigation Bar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
            <a
              href="#top"
              className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0B1F3A] whitespace-nowrap shrink-0"
            >
              Giftstar Travel Aviation
            </a>

            <nav
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600"
            >
              <a
                href="#destinations"
                className="hover:text-[#0B1F3A] transition-colors whitespace-nowrap shrink-0"
              >
                Destinations
              </a>
              <a
                href="#packages"
                className="hover:text-[#0B1F3A] transition-colors whitespace-nowrap shrink-0"
              >
                Packages
              </a>
              <a
                href="#aviation"
                className="hover:text-[#0B1F3A] transition-colors whitespace-nowrap shrink-0"
              >
                Flights & Hotels
              </a>
              <a
                href="#ai-planner"
                className="hover:text-[#0B1F3A] transition-colors whitespace-nowrap shrink-0"
              >
                AI & Maps
              </a>
              <a
                href="#gallery"
                className="hover:text-[#0B1F3A] transition-colors whitespace-nowrap shrink-0"
              >
                Gallery
              </a>
            </nav>

            <div className="flex items-center shrink-0">
              <a
                href="#portal"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0D74CE] rounded-lg hover:bg-[#095ca6] transition-colors whitespace-nowrap shrink-0"
              >
                {user ? 'Traveler Portal' : 'Book Journey'}
              </a>
            </div>
          </div>
        </header>

        <main id="top" className="flex-1">
          {/* Editorial Hero Split */}
          <section className="bg-white border-b border-slate-200/80">
            <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-6 flex flex-col justify-between py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-4">
                      Juba, Airport Road · From Junub To The World
                    </p>
                    <h1
                      className="font-display font-semibold text-[#0B1F3A] tracking-tight leading-[1.08] text-balance mb-5"
                      style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)' }}
                    >
                      Precision Aviation & Bespoke Global Travel
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                      Direct airline ticketing across 15+ international carriers, executive air charters, 48-hour visa processing, and AI-engineered luxury itineraries from South Sudan to Dubai, East Africa, and Europe.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                      <a
                        href="#ai-planner"
                        className="px-6 py-3 bg-[#0B1F3A] text-white text-sm font-semibold rounded-xl hover:bg-[#132f57] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                      >
                        Plan With AI Concierge
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <a
                        href="#destinations"
                        className="px-5 py-3 text-sm font-semibold text-[#0B1F3A] border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        Explore Destinations
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-8 mt-10 border-t border-slate-200">
                    <div>
                      <p className="font-mono-tabular text-2xl font-semibold text-[#0B1F3A]">15+</p>
                      <p className="text-xs text-slate-500 mt-0.5">Partner Airlines</p>
                    </div>
                    <div>
                      <p className="font-mono-tabular text-2xl font-semibold text-[#0B1F3A]">48h</p>
                      <p className="text-xs text-slate-500 mt-0.5">UAE Visa Turnaround</p>
                    </div>
                    <div>
                      <p className="font-mono-tabular text-2xl font-semibold text-[#0B1F3A]">24/7</p>
                      <p className="text-xs text-slate-500 mt-0.5">Juba Charter Dispatch</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-6 relative rounded-2xl overflow-hidden bg-slate-900 min-h-[340px]"
                >
                  <img
                    src={HERO_AVIATION_IMAGE}
                    alt="Commercial jet on sunlit international airport tarmac at golden hour"
                    referrerPolicy="no-referrer"
                    className="w-full h-full lg:h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/85 via-[#0B1F3A]/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-sky-200 font-medium">JUB International Dispatch</p>
                      <p className="font-display text-xl font-semibold mt-0.5">
                        Commercial Ticketing & Private Charter
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setBookingDraft({
                          bookingType: 'flight',
                          itemId: 'hero-charter-consult',
                          itemTitle: 'Priority Flight / Air Charter Request',
                          destination: 'Juba → Global Hub',
                          unitPriceUsd: 690,
                        })
                      }
                      className="px-4 py-2 bg-white text-[#0B1F3A] text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                    >
                      Request Flight Quote
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* 4-Column Service Pillars Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-10 border-t border-slate-200">
                {CORE_SERVICES.map((svc) => (
                  <div key={svc.number} className="space-y-2">
                    <p className="font-mono-tabular text-xs font-semibold text-[#0D74CE]">
                      {svc.number}.
                    </p>
                    <h3 className="font-display text-lg font-semibold text-[#0B1F3A]">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{svc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Partner Airlines Strip */}
          <div className="bg-[#F4F6FA] border-b border-slate-200 py-5">
            <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <span className="text-xs font-semibold text-[#0B1F3A] whitespace-nowrap">
                Airline Alliances
              </span>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                {PARTNER_AIRLINES.slice(0, 10).map((airline) => (
                  <span key={airline} className="whitespace-nowrap">
                    {airline}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Destinations Section */}
          <section id="destinations" className="py-20 bg-[#FAFBFD]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="max-w-2xl mb-12">
                <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
                  Curated Corridors
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight text-balance">
                  Signature Destinations Connected From Juba
                </h2>
                <p className="mt-3 text-slate-600 text-base leading-relaxed">
                  Select any destination to review visa requirements, flight times from JUB, and explore real-time transfer routes on Google Maps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {DESTINATIONS.map((dest) => (
                  <article
                    key={dest.id}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                      <img
                        src={dest.image}
                        alt={`${dest.name}, ${dest.country}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-mono-tabular text-sky-200">
                            {dest.airportCode} · {dest.flightTimeFromJub}
                          </p>
                          <h3 className="font-display text-xl font-semibold">{dest.name}</h3>
                        </div>
                        <span className="font-mono-tabular text-xs font-semibold bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-md">
                          From ${dest.startingPriceUsd.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">
                          {dest.country} · Best {dest.bestSeason}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">{dest.tagline}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setActiveDestModal(dest)}
                          className="text-xs font-semibold text-[#0B1F3A] hover:text-[#0D74CE] transition-colors"
                        >
                          Destination Guide →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMapDest(dest);
                            document.getElementById('map-explorer')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-xs font-medium text-[#0D74CE] inline-flex items-center gap-1 hover:underline"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          View Map
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Tour Packages Section */}
          <section id="packages" className="py-20 bg-white border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
                    Turnkey Journeys
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight">
                    Curated Luxury Tour Packages
                  </h2>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
                  {(['All', 'Signature', 'Executive', 'Bespoke'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setPackageTierFilter(tier)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        packageTierFilter === tier
                          ? 'bg-white text-[#0B1F3A] shadow-xs'
                          : 'text-slate-600 hover:text-[#0B1F3A]'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                {mergedPackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="bg-[#FAFBFD] border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-5 relative min-h-[200px] bg-slate-900">
                      <img
                        src={pkg.image}
                        alt={pkg.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                          <span className="font-medium text-[#0D74CE]">{pkg.tier}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{pkg.durationDays} Days</span>
                          <span aria-hidden="true">·</span>
                          <span>{pkg.destination}</span>
                        </div>
                        <h3 className="font-display text-xl font-semibold text-[#0B1F3A] mb-2">
                          {pkg.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">{pkg.summary}</p>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {pkg.highlights.slice(0, 3).map((item) => (
                            <li key={item} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0D74CE] shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div>
                          <p className="text-[11px] text-slate-500">Per Traveler</p>
                          <p className="font-mono-tabular text-lg font-semibold text-[#0B1F3A]">
                            ${pkg.priceUsd.toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBookingDraft({
                              bookingType: 'package',
                              itemId: pkg.id,
                              itemTitle: pkg.title,
                              destination: pkg.destination,
                              unitPriceUsd: pkg.priceUsd,
                              defaultGuests: 2,
                            })
                          }
                          className="px-4 py-2 bg-[#0B1F3A] text-white text-xs font-semibold rounded-xl hover:bg-[#132f57] transition-colors"
                        >
                          Reserve Package
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Flight Information & Hotel Listings Section */}
          <section id="aviation" className="py-20 bg-[#F4F6FA] border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
                    Live Dispatch & Partner Properties
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight">
                    Flight Schedules, Air Charter & Hotel Listings
                  </h2>
                </div>

                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => setAviationTab('flights')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                      aviationTab === 'flights'
                        ? 'bg-[#0B1F3A] text-white'
                        : 'text-slate-600 hover:text-[#0B1F3A]'
                    }`}
                  >
                    <Plane className="w-3.5 h-3.5" />
                    Flights & Air Charter
                  </button>
                  <button
                    type="button"
                    onClick={() => setAviationTab('hotels')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                      aviationTab === 'hotels'
                        ? 'bg-[#0B1F3A] text-white'
                        : 'text-slate-600 hover:text-[#0B1F3A]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Partner Hotels
                  </button>
                </div>
              </div>

              {aviationTab === 'flights' ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {(['All', 'Scheduled', 'Air Charter'] as const).map((ftype) => (
                        <button
                          key={ftype}
                          type="button"
                          onClick={() => setFlightTypeFilter(ftype)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            flightTypeFilter === ftype
                              ? 'bg-[#0D74CE] text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-[#0B1F3A]'
                          }`}
                        >
                          {ftype}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Fares shown in USD · Instant multi-carrier issuance
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-[#FAFBFD]">
                          <th className="py-3.5 px-5">Carrier & Flight</th>
                          <th className="py-3.5 px-4">Corridor</th>
                          <th className="py-3.5 px-4">Schedule</th>
                          <th className="py-3.5 px-4">Aircraft</th>
                          <th className="py-3.5 px-4 text-right">Economy</th>
                          <th className="py-3.5 px-4 text-right">Business / Charter</th>
                          <th className="py-3.5 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredFlights.map((flt) => (
                          <tr key={flt.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-5">
                              <p className="font-semibold text-[#0B1F3A]">{flt.airline}</p>
                              <p className="font-mono-tabular text-[11px] text-slate-500 mt-0.5">
                                {flt.flightNumber} · {flt.frequency}
                              </p>
                            </td>
                            <td className="py-4 px-4 font-mono-tabular font-medium text-[#0B1F3A]">
                              {flt.originCode} → {flt.destinationCode}
                              <span className="block font-sans font-normal text-[11px] text-slate-500">
                                {flt.originCity} to {flt.destinationCity}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-mono-tabular text-slate-700">
                              {flt.departureTime} – {flt.arrivalTime}
                              <span className="block text-[11px] text-slate-500">{flt.duration}</span>
                            </td>
                            <td className="py-4 px-4 text-slate-600">{flt.aircraft}</td>
                            <td className="py-4 px-4 text-right font-mono-tabular font-semibold text-[#0B1F3A]">
                              ${flt.economyUsd.toLocaleString()}
                            </td>
                            <td className="py-4 px-4 text-right font-mono-tabular font-semibold text-[#0D74CE]">
                              ${flt.businessUsd.toLocaleString()}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setBookingDraft({
                                    bookingType: 'flight',
                                    itemId: flt.id,
                                    itemTitle: `${flt.airline} (${flt.flightNumber})`,
                                    destination: `${flt.originCode} → ${flt.destinationCode}`,
                                    unitPriceUsd: flt.economyUsd,
                                  })
                                }
                                className="px-3.5 py-1.5 bg-[#0B1F3A] text-white text-xs font-medium rounded-lg hover:bg-[#132f57] whitespace-nowrap"
                              >
                                Book Seat
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {HOTEL_LISTINGS.map((htl) => (
                    <article
                      key={htl.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative">
                        <img
                          src={htl.image}
                          alt={htl.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 left-3 bg-[#0B1F3A]/85 text-white px-2.5 py-1 rounded-md text-[11px] font-mono-tabular">
                          ${htl.nightlyUsd} / night
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                            <span>{htl.city}</span>
                            <span className="inline-flex items-center gap-1 font-mono-tabular text-[#0B1F3A]">
                              <Star className="w-3 h-3 fill-[#C8923A] text-[#C8923A]" />
                              {htl.rating}
                            </span>
                          </div>
                          <h3 className="font-display text-lg font-semibold text-[#0B1F3A] leading-snug mb-2">
                            {htl.name}
                          </h3>
                          <p className="text-[11px] text-[#0D74CE] mb-2">
                            {htl.distanceFromAirport}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {htl.amenities.join(' · ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBookingDraft({
                              bookingType: 'hotel',
                              itemId: htl.id,
                              itemTitle: `${htl.name} (${htl.city})`,
                              destination: `${htl.city}, ${htl.country}`,
                              unitPriceUsd: htl.nightlyUsd * 3,
                            })
                          }
                          className="w-full py-2 px-4 bg-[#0B1F3A] text-white text-xs font-semibold rounded-xl hover:bg-[#132f57]"
                        >
                          Reserve Stay
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Interactive Google Maps Explorer */}
          <GoogleMapsExplorer
            mapsApiKey={mapsApiKey}
            selectedDestination={selectedMapDest}
            onSelectDestination={setSelectedMapDest}
            onBookDestination={(dest) =>
              setBookingDraft({
                bookingType: 'package',
                itemId: dest.id,
                itemTitle: `${dest.name} Bespoke Concierge`,
                destination: `${dest.name}, ${dest.country}`,
                unitPriceUsd: dest.startingPriceUsd,
              })
            }
          />

          {/* AI-Powered Trip Planner */}
          <AiTripPlanner
            onBookItinerary={(itinerary, destination, budgetUsd, groupSize) =>
              setBookingDraft({
                bookingType: 'custom_itinerary',
                itemId: `ai_${Date.now()}`,
                itemTitle: itinerary.title,
                destination,
                unitPriceUsd: Math.round(budgetUsd / Math.max(1, groupSize)),
                defaultGuests: groupSize,
                notes: `AI Route: ${itinerary.recommendedAirline} | Hotel: ${itinerary.recommendedHotel}`,
              })
            }
            onExportItineraryDoc={handleExportAiItineraryDoc}
            exportBusy={confirmBusy}
          />

          {/* Billboard & Campaign Gallery (6 Uploaded Brand Images) */}
          <BillboardGallery />

          {/* Verified Customer Reviews */}
          <ReviewsSection reviews={reviews} user={user} onSignIn={handleSignIn} />

          {/* Complete Booking System, Traveler Portal & Admin Dashboard */}
          <PortalAndAdmin
            user={user}
            isAdmin={admin}
            workspaceToken={workspaceToken}
            workspaceEmail={workspaceEmail}
            myBookings={myBookings}
            allBookings={allBookings}
            spreadsheetUrl={spreadsheetUrl}
            onSignIn={handleSignIn}
            onSignOut={signOutTraveler}
            onConnectWorkspace={handleConnectWorkspace}
            onSendEmailRequest={handleSendEmailRequest}
            onCreateDocRequest={handleCreateDocRequest}
            onDownloadPdfRequest={handleDownloadPdfRequest}
            onSyncSheetsRequest={handleSyncSheetsRequest}
            onOpenGoDaddyExport={() => setGoDaddyModalOpen(true)}
          />
        </main>

        {/* Quiet Editorial Footer */}
        <footer className="bg-[#0B1F3A] text-slate-300 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={AGENCY_BRAND_LOGO}
                  alt="Giftstar Travel Aviation emblem"
                  referrerPolicy="no-referrer"
                  className="h-12 w-auto rounded-lg bg-white p-1 object-contain"
                />
                <div>
                  <p className="font-display text-lg font-semibold text-white">
                    Giftstar Travel Aviation
                  </p>
                  <p className="text-xs text-sky-200">From Junub To The World</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Full-service aviation ticketing, air charter dispatch, visa processing, migration & study abroad advisory, luxury hotels, and East African safaris.
              </p>
            </div>

            <div className="md:col-span-4 space-y-2 text-xs">
              <p className="font-semibold text-white mb-3">Juba Head Office</p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#7BC0FF]" />
                Juba, Airport Road, South Sudan
              </p>
              <p className="flex items-center gap-2 font-mono-tabular">
                <Phone className="w-3.5 h-3.5 text-[#7BC0FF]" />
                +211 989 991 000 / +211 920 548 083
              </p>
              <p>Email: travelaviation@giftstartravellc.com</p>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <p className="font-semibold text-white mb-3">Quick Navigation</p>
              <div className="grid grid-cols-2 gap-2">
                <a href="#destinations" className="hover:text-white transition-colors">
                  Destinations
                </a>
                <a href="#packages" className="hover:text-white transition-colors">
                  Tour Packages
                </a>
                <a href="#aviation" className="hover:text-white transition-colors">
                  Flights & Hotels
                </a>
                <a href="#map-explorer" className="hover:text-white transition-colors">
                  Maps Explorer
                </a>
                <a href="#ai-planner" className="hover:text-white transition-colors">
                  AI Trip Planner
                </a>
                <a href="#gallery" className="hover:text-white transition-colors">
                  Billboards
                </a>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setGoDaddyModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0D74CE] rounded-lg hover:bg-[#095ca6] transition-colors whitespace-nowrap"
                >
                  Copy Design to GoDaddy
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 py-5 px-6 text-center text-[11px] text-slate-400">
            © {new Date().getFullYear()} Giftstar Travel Aviation. All rights reserved.
          </div>
        </footer>

        {/* Modals & Notifications */}
        <DestinationDetailModal
          destination={activeDestModal}
          onClose={() => setActiveDestModal(null)}
          onExploreOnMap={(dest) => {
            setSelectedMapDest(dest);
            document.getElementById('map-explorer')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onBookDestination={(dest) =>
            setBookingDraft({
              bookingType: 'package',
              itemId: dest.id,
              itemTitle: `${dest.name} Bespoke Concierge`,
              destination: `${dest.name}, ${dest.country}`,
              unitPriceUsd: dest.startingPriceUsd,
            })
          }
        />

        <BookingModal
          draft={bookingDraft}
          user={user}
          onClose={() => setBookingDraft(null)}
          onSignIn={handleSignIn}
          onCreated={() => showToast('success', 'Reservation saved to your Traveler Portal.')}
        />

        <ConfirmDialog
          open={Boolean(confirmAction)}
          title={confirmAction?.title || ''}
          description={confirmAction?.description || ''}
          details={confirmAction?.details}
          confirmLabel={confirmAction?.confirmLabel}
          busy={confirmBusy}
          onConfirm={executeConfirmedAction}
          onCancel={() => !confirmBusy && setConfirmAction(null)}
        />

        <GoDaddyExportModal
          open={goDaddyModalOpen}
          onClose={() => setGoDaddyModalOpen(false)}
        />

        {toast && (
          <div
            role="status"
            className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-[#0B1F3A] text-white border-[#0D74CE]'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
