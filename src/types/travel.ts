export interface DestinationItem {
  id: string;
  name: string;
  country: string;
  region: 'East Africa' | 'Middle East' | 'Mediterranean' | 'Indian Ocean';
  airportCode: string;
  flightTimeFromJub: string;
  bestSeason: string;
  startingPriceUsd: number;
  tagline: string;
  description: string;
  visaSummary: string;
  image: string;
  coordinates: { lat: number; lng: number };
  airportCoordinates: { lat: number; lng: number };
  airportName: string;
  highlights: string[];
}

export interface TourPackage {
  id: string;
  title: string;
  destination: string;
  region: string;
  durationDays: number;
  priceUsd: number;
  tier: 'Signature' | 'Executive' | 'Bespoke';
  summary: string;
  highlights: string[];
  active: boolean;
  image: string;
  isFirestore?: boolean;
}

export interface FlightRoute {
  id: string;
  flightNumber: string;
  airline: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  aircraft: string;
  frequency: string;
  economyUsd: number;
  businessUsd: number;
  type: 'Scheduled' | 'Air Charter';
}

export interface HotelListing {
  id: string;
  name: string;
  city: string;
  country: string;
  category: 'Flagship Luxury' | 'Business Executive' | 'Safari Sanctuary';
  rating: number;
  nightlyUsd: number;
  distanceFromAirport: string;
  amenities: string[];
  image: string;
  coordinates: { lat: number; lng: number };
}

export interface BillboardAsset {
  id: string;
  title: string;
  caption: string;
  image: string;
  projectType: 'Outdoor Billboards' | 'Roll-Up Banners' | 'Digital Campaigns' | 'Brand Identity';
  location: 'Juba Airport Road' | 'East Africa Regional' | 'Dubai & International' | 'Corporate Studio';
  dateLabel: string;
  featuredServices: string[];
}

export interface BookingRecord {
  id: string;
  bookingRef: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingType: 'package' | 'flight' | 'hotel' | 'custom_itinerary';
  itemId: string;
  itemTitle: string;
  destination: string;
  travelDate: string;
  returnDate?: string;
  guests: number;
  cabinOrTier: string;
  totalUsd: number;
  status: 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';
  notes?: string;
  googleDocId?: string;
  googleDocUrl?: string;
  sheetSynced?: boolean;
  emailSent?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerReview {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  routeOrPackage: string;
  rating: number;
  comment: string;
  status: 'published' | 'hidden';
  createdAt?: unknown;
}

export interface GeneratedItineraryDay {
  dayNumber: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  highlightStop: {
    name: string;
    lat: number;
    lng: number;
  };
}

export interface GeneratedItinerary {
  title: string;
  summary: string;
  recommendedAirline: string;
  recommendedHotel: string;
  visaAdvisory: string;
  estimatedBreakdown: {
    flightsUsd: number;
    accommodationUsd: number;
    experiencesAndDiningUsd: number;
    transfersAndConciergeUsd: number;
  };
  days: GeneratedItineraryDay[];
}
