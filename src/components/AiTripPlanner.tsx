import React, { useState } from 'react';
import { Calendar, Compass, FileText, Plane, Sparkles, Users } from 'lucide-react';
import { GeneratedItinerary } from '../types/travel';

const INTEREST_OPTIONS = [
  'Safaris & Wildlife',
  'Luxury Waterfront',
  'Cultural Heritage',
  'Business & Charter',
  'Culinary & Dining',
  'Study / Migration Scouting',
];

interface AiTripPlannerProps {
  onBookItinerary: (itinerary: GeneratedItinerary, destination: string, budgetUsd: number, groupSize: number) => void;
  onExportItineraryDoc: (itinerary: GeneratedItinerary, destination: string) => void;
  exportBusy?: boolean;
}

export const AiTripPlanner: React.FC<AiTripPlannerProps> = ({
  onBookItinerary,
  onExportItineraryDoc,
  exportBusy = false,
}) => {
  const [origin, setOrigin] = useState('Juba, South Sudan (JUB)');
  const [destination, setDestination] = useState('Dubai, United Arab Emirates');
  const [budgetUsd, setBudgetUsd] = useState(3800);
  const [durationDays, setDurationDays] = useState(5);
  const [groupSize, setGroupSize] = useState(2);
  const [travelStyle, setTravelStyle] = useState('Executive & Luxury');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Luxury Waterfront',
    'Culinary & Dining',
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);

  // Quick Aviation & Visa Advisor
  const [advisorQuestion, setAdvisorQuestion] = useState('');
  const [advisorAnswer, setAdvisorAnswer] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const toggleInterest = (item: string) => {
    setSelectedInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          budgetUsd,
          durationDays,
          groupSize,
          travelStyle,
          interests: selectedInterests,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to generate itinerary.');
      }
      setItinerary(data.itinerary);
      setActiveDay(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to trip planner.');
    } finally {
      setLoading(false);
    }
  };

  const handleAskAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorQuestion.trim()) return;
    setAdvisorLoading(true);
    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: advisorQuestion }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to retrieve advisor response.');
      }
      setAdvisorAnswer(data.answer);
    } catch (err) {
      setAdvisorAnswer(err instanceof Error ? err.message : 'Advisor unavailable.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const currentDay = itinerary?.days.find((d) => d.dayNumber === activeDay) || itinerary?.days[0];

  return (
    <section id="ai-planner" className="py-20 bg-[#0B1F3A] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-medium text-[#7BC0FF] tracking-wide mb-2">
            Intelligent Travel Architect
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight text-balance">
            AI-Powered Personalized Trip Planning
          </h2>
          <p className="mt-3 text-slate-300 text-base leading-relaxed">
            Specify your budget, schedule, group size, and preferences. Our aviation planner composes day-by-day routing, vetted hotels, visa advisories, and exportable Google Docs itineraries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Configuration Form */}
          <form
            onSubmit={handleGenerate}
            className="lg:col-span-5 bg-[#112A4C] border border-white/10 rounded-2xl p-6 space-y-5"
          >
            <div>
              <label htmlFor="ai-origin" className="block text-xs font-medium text-slate-300 mb-1.5">
                Departure Hub
              </label>
              <input
                id="ai-origin"
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B1F3A] border border-white/15 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
              />
            </div>

            <div>
              <label htmlFor="ai-destination" className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Destination
              </label>
              <input
                id="ai-destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                placeholder="e.g., Istanbul, Serengeti, Dubai, Nairobi"
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B1F3A] border border-white/15 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="ai-budget" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Budget (USD)
                </label>
                <input
                  id="ai-budget"
                  type="number"
                  min={400}
                  max={250000}
                  step={100}
                  value={budgetUsd}
                  onChange={(e) => setBudgetUsd(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm font-mono-tabular bg-[#0B1F3A] border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
                />
              </div>
              <div>
                <label htmlFor="ai-days" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Days
                </label>
                <input
                  id="ai-days"
                  type="number"
                  min={1}
                  max={14}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm font-mono-tabular bg-[#0B1F3A] border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
                />
              </div>
              <div>
                <label htmlFor="ai-guests" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Travelers
                </label>
                <input
                  id="ai-guests"
                  type="number"
                  min={1}
                  max={30}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm font-mono-tabular bg-[#0B1F3A] border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ai-style" className="block text-xs font-medium text-slate-300 mb-1.5">
                Travel Tier
              </label>
              <select
                id="ai-style"
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B1F3A] border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
              >
                <option value="Executive & Luxury">Executive & Luxury</option>
                <option value="Signature Leisure">Signature Leisure</option>
                <option value="Private Air Charter & VIP">Private Air Charter & VIP</option>
                <option value="Family Holiday">Family Holiday</option>
                <option value="Academic & Migration">Academic & Migration</option>
              </select>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-300 mb-2">Priorities & Interests</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const active = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        active
                          ? 'bg-[#0D74CE] border-[#0D74CE] text-white'
                          : 'bg-[#0B1F3A] border-white/15 text-slate-300 hover:border-white/35'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-amber-200 bg-amber-900/40 border border-amber-500/30 rounded-xl p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-[#0D74CE] hover:bg-[#1984e3] text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Composing Itinerary...' : 'Generate Personalized Itinerary'}
            </button>
          </form>

          {/* Right Itinerary Output & Aviation Advisor */}
          <div className="lg:col-span-7 space-y-6">
            {!itinerary && !loading ? (
              <div className="bg-[#112A4C] border border-white/10 rounded-2xl p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#0D74CE]/20 border border-[#0D74CE]/30 rounded-xl text-[#7BC0FF]">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-white mb-2">
                      Ready to Blueprint Your Next Departure
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Submit your trip parameters on the left to generate a complete day-by-day schedule with partner airline routing, hotel recommendations, visa advisory, and instant Google Docs export.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-slate-300">
                  <div>
                    <p className="text-white font-semibold mb-1">15+ Airline Partners</p>
                    <p>Ethiopian, Emirates, Qatar Airways, Turkish, Kenya Airways & private charters.</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">Google Docs Export</p>
                    <p>Convert any generated plan into a formatted document and downloadable PDF.</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">Direct Reservation</p>
                    <p>Push your AI plan straight into Giftstar’s Airport Road booking desk.</p>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="bg-[#112A4C] border border-white/10 rounded-2xl p-8 space-y-4">
                <div className="h-7 w-2/3 bg-white/10 animate-pulse rounded-lg" />
                <div className="h-4 w-full bg-white/10 animate-pulse rounded-lg" />
                <div className="h-4 w-5/6 bg-white/10 animate-pulse rounded-lg" />
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="h-24 bg-white/10 animate-pulse rounded-xl" />
                  <div className="h-24 bg-white/10 animate-pulse rounded-xl" />
                </div>
              </div>
            ) : itinerary ? (
              <div className="bg-white text-[#0B1F3A] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#0D74CE]" />
                        {itinerary.days.length} Days
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#0D74CE]" />
                        {groupSize} Travelers
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">${budgetUsd.toLocaleString()} Budget</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#0B1F3A]">
                      {itinerary.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{itinerary.summary}</p>
                  </div>
                </div>

                {/* Logistics & Cost Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-[#FAFBFD] border border-slate-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-[#0D74CE]" />
                      Recommended Aviation & Stay
                    </p>
                    <p className="text-xs font-semibold text-[#0B1F3A]">{itinerary.recommendedAirline}</p>
                    <p className="text-xs text-slate-600">{itinerary.recommendedHotel}</p>
                    <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                      {itinerary.visaAdvisory}
                    </p>
                  </div>

                  <div className="bg-[#FAFBFD] border border-slate-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-slate-500">Estimated Allocation (USD)</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Flights</span>
                        <span className="font-mono-tabular font-semibold">
                          ${itinerary.estimatedBreakdown.flightsUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Hotels</span>
                        <span className="font-mono-tabular font-semibold">
                          ${itinerary.estimatedBreakdown.accommodationUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Dining & Tours</span>
                        <span className="font-mono-tabular font-semibold">
                          ${itinerary.estimatedBreakdown.experiencesAndDiningUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Concierge</span>
                        <span className="font-mono-tabular font-semibold">
                          ${itinerary.estimatedBreakdown.transfersAndConciergeUsd.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day Selector Tabs */}
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {itinerary.days.map((d) => (
                      <button
                        key={d.dayNumber}
                        type="button"
                        onClick={() => setActiveDay(d.dayNumber)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                          activeDay === d.dayNumber
                            ? 'bg-[#0B1F3A] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        Day {d.dayNumber}
                      </button>
                    ))}
                  </div>

                  {currentDay && (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-[#FAFBFD]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-display text-lg font-semibold text-[#0B1F3A]">
                          Day {currentDay.dayNumber}: {currentDay.theme}
                        </h4>
                        <span className="text-xs font-mono-tabular text-slate-500">
                          {currentDay.highlightStop.name} ({currentDay.highlightStop.lat.toFixed(2)},{' '}
                          {currentDay.highlightStop.lng.toFixed(2)})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="font-semibold text-[#0D74CE] mb-1">Morning</p>
                          <p className="text-slate-600">{currentDay.morning}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="font-semibold text-[#0D74CE] mb-1">Afternoon</p>
                          <p className="text-slate-600">{currentDay.afternoon}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="font-semibold text-[#0D74CE] mb-1">Evening</p>
                          <p className="text-slate-600">{currentDay.evening}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={exportBusy}
                    onClick={() => onExportItineraryDoc(itinerary, destination)}
                    className="px-4 py-2.5 text-sm font-medium text-[#0B1F3A] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <FileText className="w-4 h-4 text-[#0D74CE]" />
                    {exportBusy ? 'Generating Doc...' : 'Save as Google Doc'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onBookItinerary(itinerary, destination, budgetUsd, groupSize)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D74CE] rounded-xl hover:bg-[#095ca6] transition-colors"
                  >
                    Book This Itinerary
                  </button>
                </div>
              </div>
            ) : null}

            {/* Aviation & Visa Specialist Quick Query */}
            <form
              onSubmit={handleAskAdvisor}
              className="bg-[#112A4C] border border-white/10 rounded-2xl p-5 space-y-3"
            >
              <label htmlFor="concierge-q" className="block text-xs font-medium text-slate-300">
                Quick Visa, Charter & Baggage Desk Inquiry
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="concierge-q"
                  type="text"
                  value={advisorQuestion}
                  onChange={(e) => setAdvisorQuestion(e.target.value)}
                  placeholder="e.g., How fast can you process a UAE visa from Juba?"
                  className="flex-1 px-3.5 py-2 text-sm bg-[#0B1F3A] border border-white/15 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
                />
                <button
                  type="submit"
                  disabled={advisorLoading}
                  className="px-4 py-2 text-xs font-semibold bg-white text-[#0B1F3A] rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  {advisorLoading ? 'Checking...' : 'Ask Specialist'}
                </button>
              </div>
              {advisorAnswer && (
                <p className="text-xs text-slate-200 leading-relaxed pt-2 border-t border-white/10">
                  {advisorAnswer}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
