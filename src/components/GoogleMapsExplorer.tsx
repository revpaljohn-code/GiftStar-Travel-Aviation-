import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin, Navigation, Search, Star } from 'lucide-react';
import { DESTINATIONS } from '../data/catalog';
import { DestinationItem } from '../types/travel';

interface NearbyPlaceItem {
  id: string;
  name: string;
  address: string;
  category: string;
  rating?: number;
  userRatingCount?: number;
  location: { lat: number; lng: number };
  googleMapsURI?: string;
}

interface RouteSummaryState {
  distanceKm: string;
  durationMins: number;
  originLabel: string;
  destinationLabel: string;
}

function checkAndSignalQuota(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('Quota')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

const MapInnerWorkspace: React.FC<{
  selectedDestination: DestinationItem;
  onSelectDestination: (dest: DestinationItem) => void;
  onBookDestination: (dest: DestinationItem) => void;
}> = ({ selectedDestination, onSelectDestination, onBookDestination }) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [nearbyCategory, setNearbyCategory] = useState<'tourist_attraction' | 'lodging' | 'restaurant'>('tourist_attraction');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<NearbyPlaceItem | null>(null);
  const [activeMarkerEl, setActiveMarkerEl] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Autocomplete search state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [searchedPoint, setSearchedPoint] = useState<{
    name: string;
    address: string;
    location: { lat: number; lng: number };
  } | null>(null);

  // Route planner state
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'TRANSIT'>('DRIVING');
  const [routeTarget, setRouteTarget] = useState<'city' | 'selected_place'>('city');
  const [routeSummary, setRouteSummary] = useState<RouteSummaryState | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Center map when destination changes
  useEffect(() => {
    if (!map) return;
    map.panTo(selectedDestination.coordinates);
    map.setZoom(12);
    setSelectedPlaceMarker(null);
    setSearchedPoint(null);
    setRouteTarget('city');
  }, [map, selectedDestination]);

  // Places Autocomplete suggestions with session token
  useEffect(() => {
    if (!placesLib || !searchInput.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const timer = setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: searchInput,
        sessionToken: sessionTokenRef.current ?? undefined,
      })
        .then((res) => {
          if (!cancelled) {
            setSuggestions(res.suggestions || []);
          }
        })
        .catch((err) => {
          checkAndSignalQuota(err);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, searchInput]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        const loc = place.location;
        if (loc && map) {
          const latLng = { lat: loc.lat(), lng: loc.lng() };
          setSearchedPoint({
            name: place.displayName || 'Selected Location',
            address: place.formattedAddress || '',
            location: latLng,
          });
          if (place.viewport) {
            map.fitBounds(place.viewport);
          } else {
            map.panTo(latLng);
            map.setZoom(13);
          }
        }
        setSearchInput('');
        setSuggestions([]);
        sessionTokenRef.current = null;
      } catch (err) {
        checkAndSignalQuota(err);
      }
    },
    [placesLib, map]
  );

  // Nearby Attractions / Hotels / Restaurants via Places API (New)
  useEffect(() => {
    if (!placesLib) return;
    let cancelled = false;
    setNearbyLoading(true);
    setNearbyError(null);

    const center = searchedPoint ? searchedPoint.location : selectedDestination.coordinates;

    placesLib.Place.searchNearby({
      fields: [
        'id',
        'displayName',
        'location',
        'formattedAddress',
        'rating',
        'userRatingCount',
        'googleMapsURI',
        'primaryTypeDisplayName',
      ],
      locationRestriction: {
        center,
        radius: 10000,
      },
      includedPrimaryTypes: [nearbyCategory],
      maxResultCount: 6,
    })
      .then((res) => {
        if (cancelled) return;
        const mapped: NearbyPlaceItem[] = (res.places || [])
          .filter((p) => p.location)
          .map((p) => ({
            id: p.id || Math.random().toString(36).slice(2),
            name: p.displayName || 'Point of Interest',
            address: p.formattedAddress || selectedDestination.country,
            category: p.primaryTypeDisplayName || nearbyCategory.replace('_', ' '),
            rating: p.rating ?? undefined,
            userRatingCount: p.userRatingCount ?? undefined,
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
            googleMapsURI: p.googleMapsURI ?? undefined,
          }));
        setNearbyPlaces(mapped);
        setNearbyLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        checkAndSignalQuota(err);
        setNearbyPlaces([]);
        setNearbyError('Unable to fetch nearby places for this coordinate right now.');
        setNearbyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, selectedDestination, searchedPoint, nearbyCategory]);

  // Modern Route Planning via Route.computeRoutes()
  useEffect(() => {
    if (!routesLib || !map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setRouteError(null);
    setRouteLoading(true);

    const originCoords = selectedDestination.airportCoordinates;
    const destCoords =
      routeTarget === 'selected_place' && selectedPlaceMarker
        ? selectedPlaceMarker.location
        : searchedPoint
          ? searchedPoint.location
          : selectedDestination.coordinates;

    const destinationLabel =
      routeTarget === 'selected_place' && selectedPlaceMarker
        ? selectedPlaceMarker.name
        : searchedPoint
          ? searchedPoint.name
          : `${selectedDestination.name} Center`;

    const request = {
      origin: originCoords,
      destination: destCoords,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    let cancelled = false;

    (routesLib.Route as unknown as {
      computeRoutes: (req: typeof request) => Promise<{
        routes: Array<{
          createPolylines: () => google.maps.Polyline[];
          viewport?: google.maps.LatLngBounds;
          distanceMeters?: number;
          durationMillis?: number;
        }>;
      }>;
    })
      .computeRoutes(request)
      .then(({ routes }) => {
        if (cancelled) return;
        setRouteLoading(false);
        if (!routes || routes.length === 0) {
          setRouteSummary(null);
          setRouteError('No ground route available for this travel mode.');
          return;
        }
        const primaryRoute = routes[0];
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#0D74CE',
            strokeWeight: 5,
            strokeOpacity: 0.9,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;
        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }
        setRouteSummary({
          distanceKm: ((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1),
          durationMins: Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000)),
          originLabel: selectedDestination.airportName,
          destinationLabel,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setRouteLoading(false);
        checkAndSignalQuota(err);
        setRouteSummary(null);
        setRouteError('Ground route calculation unavailable for this corridor.');
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, selectedDestination, travelMode, routeTarget, selectedPlaceMarker, searchedPoint]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Interactive Control & Places Panel */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-6">
        <div className="space-y-5">
          {/* Place Autocomplete */}
          <div className="relative">
            <label htmlFor="gmp-place-search" className="block text-xs font-medium text-slate-500 mb-1.5">
              Search any city, hotel, or landmark
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="gmp-place-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g., Dubai Marina, Kilimanjaro, Taksim Square..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAFBFD] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30 focus:border-[#0D74CE]"
              />
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 max-h-56 overflow-auto">
                {suggestions.map((s, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#0B1F3A] hover:bg-slate-50 transition-colors"
                    >
                      {s.placePrediction?.text.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Hub Quick Switcher */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Giftstar Destination Hubs</p>
            <div className="flex flex-wrap gap-1.5">
              {DESTINATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDestination(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    selectedDestination.id === d.id
                      ? 'bg-[#0B1F3A] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Airport Transfer & Route Planning Panel */}
          <div className="bg-[#FAFBFD] border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1F3A]">
                <Navigation className="w-3.5 h-3.5 text-[#0D74CE]" />
                <span>Airport Transfer & Route Planner</span>
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                {(['DRIVING', 'TRANSIT', 'WALKING'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      travelMode === mode
                        ? 'bg-[#0D74CE] text-white'
                        : 'text-slate-600 hover:text-[#0B1F3A]'
                    }`}
                  >
                    {mode === 'DRIVING' ? 'Drive' : mode === 'TRANSIT' ? 'Transit' : 'Walk'}
                  </button>
                ))}
              </div>
            </div>

            {routeLoading ? (
              <p className="text-xs text-slate-500">Computing live route via Google Routes API...</p>
            ) : routeSummary ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[11px] text-slate-500">Transfer Distance</p>
                  <p className="font-mono-tabular text-base font-semibold text-[#0B1F3A]">
                    {routeSummary.distanceKm} km
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Estimated Time</p>
                  <p className="font-mono-tabular text-base font-semibold text-[#0D74CE]">
                    {routeSummary.durationMins} mins
                  </p>
                </div>
                <p className="col-span-2 text-xs text-slate-600 truncate">
                  {routeSummary.originLabel} → {routeSummary.destinationLabel}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">{routeError || 'Select a destination to compute transfer route.'}</p>
            )}
          </div>

          {/* Nearby Attractions / Hotels / Dining via Places API (New) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-[#0B1F3A]">
                Nearby Recommendations
              </p>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                {(
                  [
                    { key: 'tourist_attraction', label: 'Attractions' },
                    { key: 'lodging', label: 'Hotels' },
                    { key: 'restaurant', label: 'Dining' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setNearbyCategory(cat.key)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      nearbyCategory === cat.key
                        ? 'bg-white text-[#0B1F3A] shadow-xs'
                        : 'text-slate-600 hover:text-[#0B1F3A]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {nearbyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : nearbyError ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                {nearbyError}
              </p>
            ) : nearbyPlaces.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                No places returned within 10km. Try switching categories or searching another city.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {nearbyPlaces.map((place) => (
                  <div
                    key={place.id}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      selectedPlaceMarker?.id === place.id
                        ? 'border-[#0D74CE] bg-[#0D74CE]/5'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() => {
                      setSelectedPlaceMarker(place);
                      setRouteTarget('selected_place');
                      map?.panTo(place.location);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[#0B1F3A] leading-snug">
                          {place.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {place.address}
                        </p>
                      </div>
                      {place.rating && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular font-medium text-[#0B1F3A] shrink-0">
                          <Star className="w-3 h-3 fill-[#C8923A] text-[#C8923A]" />
                          {place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">{place.category}</span>
                      {place.googleMapsURI && (
                        <a
                          href={place.googleMapsURI}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[#0D74CE] font-medium hover:underline"
                        >
                          Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBookDestination(selectedDestination)}
          className="w-full py-2.5 px-4 bg-[#0D74CE] text-white text-sm font-medium rounded-xl hover:bg-[#095ca6] transition-colors"
        >
          Book {selectedDestination.name} Concierge
        </button>
      </div>

      {/* Right Interactive Map Canvas */}
      <div className="lg:col-span-7 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative min-h-[480px] lg:min-h-[580px]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={selectedDestination.coordinates}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%', minHeight: '480px' }}
        >
          {/* Destination Hub Pin */}
          <AdvancedMarker
            position={selectedDestination.coordinates}
            title={selectedDestination.name}
          >
            <Pin background="#0B1F3A" borderColor="#FFFFFF" glyphColor="#C8923A" scale={1.15} />
          </AdvancedMarker>

          {/* Airport Hub Pin */}
          <AdvancedMarker
            position={selectedDestination.airportCoordinates}
            title={selectedDestination.airportName}
          >
            <Pin background="#0D74CE" borderColor="#FFFFFF" glyphColor="#FFFFFF" scale={1.05} />
          </AdvancedMarker>

          {/* Searched Place Pin */}
          {searchedPoint && (
            <AdvancedMarker position={searchedPoint.location} title={searchedPoint.name}>
              <Pin background="#C8923A" borderColor="#FFFFFF" glyphColor="#FFFFFF" scale={1.15} />
            </AdvancedMarker>
          )}

          {/* Nearby Places Pins */}
          {nearbyPlaces.map((place) => (
            <AdvancedMarker
              key={place.id}
              position={place.location}
              title={place.name}
              ref={selectedPlaceMarker?.id === place.id ? setActiveMarkerEl : undefined}
              onClick={() => {
                setSelectedPlaceMarker(place);
                setRouteTarget('selected_place');
              }}
            >
              <Pin
                background={selectedPlaceMarker?.id === place.id ? '#C8923A' : '#1E3A5F'}
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={0.95}
              />
            </AdvancedMarker>
          ))}

          {selectedPlaceMarker && activeMarkerEl && (
            <InfoWindow
              anchor={activeMarkerEl}
              onCloseClick={() => setSelectedPlaceMarker(null)}
              maxWidth={240}
            >
              <div className="p-1">
                <p className="text-xs font-semibold text-[#0B1F3A]">{selectedPlaceMarker.name}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{selectedPlaceMarker.address}</p>
                {selectedPlaceMarker.rating && (
                  <p className="text-[11px] text-slate-700 mt-1 font-medium">
                    Rating: {selectedPlaceMarker.rating} ({selectedPlaceMarker.userRatingCount || 0})
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export const GoogleMapsExplorer: React.FC<{
  mapsApiKey: string;
  selectedDestination: DestinationItem;
  onSelectDestination: (dest: DestinationItem) => void;
  onBookDestination: (dest: DestinationItem) => void;
}> = ({ mapsApiKey, selectedDestination, onSelectDestination, onBookDestination }) => {
  return (
    <section id="map-explorer" className="py-20 bg-[#FAFBFD] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
            Interactive Geospatial Concierge
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight text-balance">
            Explore Destinations, Transfer Routes & Nearby Landmarks
          </h2>
          <p className="mt-3 text-slate-600 text-base leading-relaxed">
            Inspect live airport-to-hotel transfer times, discover vetted attractions and stays around each hub, or search any global city.
          </p>
        </div>

        {!mapsApiKey ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <MapPin className="w-8 h-8 text-[#0D74CE] mx-auto mb-3" />
            <h3 className="font-display text-xl font-semibold text-[#0B1F3A] mb-2">
              Google Maps Explorer Ready
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Configure your Google Maps API key environment variable to activate interactive live maps, route calculations, and nearby place discovery.
            </p>
          </div>
        ) : (
          <APIProvider apiKey={mapsApiKey} language="en" region="SS">
            <MapInnerWorkspace
              selectedDestination={selectedDestination}
              onSelectDestination={onSelectDestination}
              onBookDestination={onBookDestination}
            />
          </APIProvider>
        )}
      </div>
    </section>
  );
};
