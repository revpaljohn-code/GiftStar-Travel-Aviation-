import React, { useMemo, useState } from 'react';
import { Expand, MapPin, X } from 'lucide-react';
import { BILLBOARD_GALLERY } from '../data/catalog';
import { BillboardAsset } from '../types/travel';

const PROJECT_TYPES = [
  'All Types',
  'Outdoor Billboards',
  'Roll-Up Banners',
  'Digital Campaigns',
  'Brand Identity',
] as const;

const LOCATIONS = [
  'All Locations',
  'Juba Airport Road',
  'East Africa Regional',
  'Dubai & International',
  'Corporate Studio',
] as const;

export const BillboardGallery: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [activeAsset, setActiveAsset] = useState<BillboardAsset | null>(null);

  const filteredAssets = useMemo(() => {
    return BILLBOARD_GALLERY.filter((item) => {
      const matchesType = selectedType === 'All Types' || item.projectType === selectedType;
      const matchesLoc = selectedLocation === 'All Locations' || item.location === selectedLocation;
      return matchesType && matchesLoc;
    });
  }, [selectedType, selectedLocation]);

  return (
    <section id="gallery" className="py-20 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#0D74CE] tracking-wide mb-2">
              Brand Heritage & Outdoor Campaigns
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1F3A] tracking-tight text-balance">
              Billboard & Aviation Campaign Archive
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Our visual identity is rooted in Giftstar Travel Aviation’s real-world billboards across Juba Airport Road and East Africa—pairing crisp aviation navy with cerulean sky curves.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono-tabular">
            Showing {filteredAssets.length} of {BILLBOARD_GALLERY.length} campaigns
          </div>
        </div>

        {/* Dual interactive filters: Project Type + Location */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {PROJECT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedType === type
                    ? 'bg-white text-[#0B1F3A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0B1F3A]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="billboard-location-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Location
            </label>
            <select
              id="billboard-location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium text-[#0B1F3A] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D74CE]/30"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-14 text-center bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-sm text-slate-600 mb-3">
              No campaigns match that exact project type and location combination.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedType('All Types');
                setSelectedLocation('All Locations');
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0B1F3A] rounded-lg hover:bg-[#132f57] transition-colors"
            >
              Reset Gallery Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredAssets.map((asset) => (
              <article
                key={asset.id}
                className="group bg-[#FAFBFD] border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                  <img
                    src={asset.image}
                    alt={asset.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <button
                    type="button"
                    onClick={() => setActiveAsset(asset)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/95 text-[#0B1F3A] text-xs font-medium rounded-lg inline-flex items-center gap-1.5 hover:bg-white transition-colors"
                  >
                    <Expand className="w-3.5 h-3.5" />
                    Inspect
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span>{asset.projectType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{asset.location}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#0B1F3A] mb-2 leading-snug">
                    {asset.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                    {asset.caption}
                  </p>
                  <div className="pt-3 border-t border-slate-200/80 text-xs text-slate-500">
                    {asset.featuredServices.join(' · ')}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Inspector */}
      {activeAsset && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1F3A]/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 bg-slate-950 flex items-center justify-center max-h-[75vh]">
              <img
                src={activeAsset.image}
                alt={activeAsset.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[75vh]"
              />
            </div>
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="text-xs text-[#0D74CE] font-medium">
                    {activeAsset.projectType} · {activeAsset.dateLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveAsset(null)}
                    className="p-1.5 text-slate-400 hover:text-[#0B1F3A] rounded-lg"
                    aria-label="Close lightbox"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-display text-2xl font-semibold text-[#0B1F3A] mb-3">
                  {activeAsset.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  {activeAsset.caption}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-700 mb-5">
                  <MapPin className="w-4 h-4 text-[#0D74CE]" />
                  <span>{activeAsset.location}</span>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Services Highlighted</p>
                  <p className="text-sm text-[#0B1F3A] leading-relaxed">
                    {activeAsset.featuredServices.join(' · ')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveAsset(null)}
                className="mt-6 w-full py-2.5 px-4 bg-[#0B1F3A] text-white text-sm font-medium rounded-lg hover:bg-[#132f57] transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
