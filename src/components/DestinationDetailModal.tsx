import React from 'react';
import { Calendar, MapPin, Plane, ShieldCheck, X } from 'lucide-react';
import { DestinationItem } from '../types/travel';

interface DestinationDetailModalProps {
  destination: DestinationItem | null;
  onClose: () => void;
  onExploreOnMap: (dest: DestinationItem) => void;
  onBookDestination: (dest: DestinationItem) => void;
}

export const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({
  destination,
  onClose,
  onExploreOnMap,
  onBookDestination,
}) => {
  if (!destination) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1F3A]/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-5 relative min-h-[240px] bg-slate-900">
          <img
            src={destination.image}
            alt={destination.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-xs font-mono-tabular text-sky-200">
              {destination.airportCode} · {destination.region}
            </p>
            <h3 className="font-display text-2xl font-semibold mt-0.5">{destination.name}</h3>
            <p className="text-xs text-slate-200">{destination.country}</p>
          </div>
        </div>

        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <p className="text-xs font-medium text-[#0D74CE]">{destination.tagline}</p>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-[#0B1F3A] rounded-lg"
                aria-label="Close destination details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              {destination.description}
            </p>

            <div className="grid grid-cols-3 gap-3 bg-[#FAFBFD] border border-slate-200 rounded-xl p-3.5 mb-5 text-xs">
              <div>
                <p className="text-slate-500 flex items-center gap-1">
                  <Plane className="w-3 h-3 text-[#0D74CE]" />
                  From JUB
                </p>
                <p className="font-mono-tabular font-semibold text-[#0B1F3A] mt-0.5">
                  {destination.flightTimeFromJub}
                </p>
              </div>
              <div>
                <p className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0D74CE]" />
                  Best Window
                </p>
                <p className="font-semibold text-[#0B1F3A] mt-0.5">{destination.bestSeason}</p>
              </div>
              <div>
                <p className="text-slate-500">Packages From</p>
                <p className="font-mono-tabular font-semibold text-[#0D74CE] mt-0.5">
                  ${destination.startingPriceUsd.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#0B1F3A] mb-1.5">Signature Highlights</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {destination.highlights.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-[#0D74CE] shrink-0 mt-0.5" />
                <span>{destination.visaSummary}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                onExploreOnMap(destination);
              }}
              className="px-4 py-2 text-xs font-semibold text-[#0B1F3A] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0D74CE]" />
              Explore on Google Maps
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBookDestination(destination);
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0D74CE] rounded-xl hover:bg-[#095ca6]"
            >
              Reserve Journey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
