import {
  AGENCY_BRAND_LOGO,
  BILLBOARD_GALLERY,
  CORE_SERVICES,
  DESTINATIONS,
  FLIGHT_ROUTES,
  HERO_AVIATION_IMAGE,
  PARTNER_AIRLINES,
  TOUR_PACKAGES,
} from '../data/catalog';

export interface GoDaddyExportOptions {
  assetBaseUrl: string;
  bookingActionUrl: string;
  includeBillboards: boolean;
  includeFlights: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveUrl(base: string, path: string): string {
  const cleanBase = base.trim().replace(/\/+$/, '');
  if (!cleanBase || cleanBase === '.') {
    return `.${path.startsWith('/') ? path : `/${path}`}`;
  }
  return `${cleanBase}${path.startsWith('/') ? path : `/${path}`}`;
}

export const GIFTSTAR_THEME_TOKENS = `/* Giftstar Travel Aviation — Brand Design Tokens */
:root {
  --gs-navy: #0B1F3A;
  --gs-navy-hover: #132F57;
  --gs-sky: #0D74CE;
  --gs-sky-soft: #7BC0FF;
  --gs-gold: #C8923A;
  --gs-canvas: #FAFBFD;
  --gs-surface: #FFFFFF;
  --gs-surface-muted: #F4F6FA;
  --gs-border: #E2E8F0;
  --gs-ink-muted: #475569;
  --gs-font-display: 'Playfair Display', Georgia, serif;
  --gs-font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --gs-font-mono: 'JetBrains Mono', monospace;
}

/* Google Fonts Import for GoDaddy Custom CSS */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');`;

function buildScopedStyles(): string {
  return `<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

.gs-root {
  --gs-navy: #0B1F3A;
  --gs-navy-hover: #132F57;
  --gs-sky: #0D74CE;
  --gs-gold: #C8923A;
  --gs-canvas: #FAFBFD;
  --gs-muted: #F4F6FA;
  --gs-border: #E2E8F0;
  --gs-slate: #475569;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--gs-navy);
  background: var(--gs-canvas);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.gs-root *, .gs-root *::before, .gs-root *::after { box-sizing: border-box; }
.gs-root a { color: inherit; text-decoration: none; }
.gs-root img { display: block; max-width: 100%; }
.gs-display { font-family: 'Playfair Display', Georgia, serif; }
.gs-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
.gs-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }

/* Header */
.gs-header {
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid var(--gs-border);
  position: sticky;
  top: 0;
  z-index: 40;
}
.gs-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 68px;
}
.gs-brand {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--gs-navy);
  white-space: nowrap;
}
.gs-nav { display: flex; align-items: center; gap: 24px; font-size: 13px; font-weight: 500; color: var(--gs-slate); }
.gs-nav a:hover { color: var(--gs-navy); }
.gs-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  background: var(--gs-sky);
  color: #FFFFFF !important;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  white-space: nowrap;
}
.gs-btn-navy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  background: var(--gs-navy);
  color: #FFFFFF !important;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
}
.gs-btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: #FFFFFF;
  color: var(--gs-navy) !important;
  border: 1px solid var(--gs-border);
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
}

/* Hero */
.gs-hero { background: #FFFFFF; border-bottom: 1px solid var(--gs-border); padding: 52px 0; }
.gs-hero-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 36px; align-items: stretch; }
.gs-hero-copy { grid-column: span 6; display: flex; flex-direction: column; justify-content: space-between; }
.gs-hero-media { grid-column: span 6; position: relative; border-radius: 18px; overflow: hidden; min-height: 360px; background: #0B1F3A; }
.gs-hero-media img { width: 100%; height: 100%; object-fit: cover; }
.gs-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(11, 31, 58, 0.88) 0%, rgba(11, 31, 58, 0.15) 60%, transparent 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  color: #FFFFFF;
}
.gs-eyebrow { font-size: 12px; font-weight: 600; color: var(--gs-sky); margin: 0 0 12px; letter-spacing: 0.02em; }
.gs-h1 { font-size: clamp(34px, 4vw, 54px); line-height: 1.08; margin: 0 0 18px; font-weight: 600; letter-spacing: -0.02em; }
.gs-lead { font-size: 16px; color: var(--gs-slate); margin: 0 0 28px; max-width: 540px; }
.gs-cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
.gs-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; border-top: 1px solid var(--gs-border); padding-top: 24px; margin-top: 32px; }
.gs-stat-val { font-size: 24px; font-weight: 600; margin: 0; color: var(--gs-navy); }
.gs-stat-lbl { font-size: 12px; color: var(--gs-slate); margin: 4px 0 0; }

/* Services Strip */
.gs-services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; border-top: 1px solid var(--gs-border); margin-top: 44px; padding-top: 36px; }
.gs-service-num { font-size: 12px; font-weight: 600; color: var(--gs-sky); margin: 0 0 6px; }
.gs-service-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
.gs-service-desc { font-size: 13px; color: var(--gs-slate); margin: 0; }

/* Airlines Bar */
.gs-airlines { background: var(--gs-muted); border-bottom: 1px solid var(--gs-border); padding: 18px 0; }
.gs-airlines-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; color: var(--gs-slate); }

/* Sections */
.gs-section { padding: 72px 0; }
.gs-section-white { background: #FFFFFF; border-top: 1px solid var(--gs-border); }
.gs-section-muted { background: var(--gs-muted); border-top: 1px solid var(--gs-border); }
.gs-h2 { font-size: clamp(28px, 3vw, 38px); font-weight: 600; margin: 0 0 12px; letter-spacing: -0.015em; }
.gs-sub { font-size: 15px; color: var(--gs-slate); max-width: 640px; margin: 0 0 38px; }

/* Cards Grid */
.gs-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.gs-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.gs-card { background: #FFFFFF; border: 1px solid var(--gs-border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
.gs-card-img-wrap { position: relative; aspect-ratio: 4 / 3; background: #0B1F3A; overflow: hidden; }
.gs-card-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
.gs-card-img-caption {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 55%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 16px;
  color: #FFFFFF;
}
.gs-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
.gs-price-tag { background: rgba(255,255,255,0.16); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }

/* Package Horizontal Card */
.gs-pkg { background: var(--gs-canvas); border: 1px solid var(--gs-border); border-radius: 16px; overflow: hidden; display: grid; grid-template-columns: 5fr 7fr; }
.gs-pkg-img { min-height: 220px; background: #0B1F3A; }
.gs-pkg-img img { width: 100%; height: 100%; object-fit: cover; }
.gs-pkg-body { padding: 22px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; }
.gs-meta-line { font-size: 12px; color: var(--gs-slate); margin: 0 0 6px; }
.gs-meta-line strong { color: var(--gs-sky); }

/* Flights Table */
.gs-table-wrap { background: #FFFFFF; border: 1px solid var(--gs-border); border-radius: 16px; overflow-x: auto; }
.gs-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.gs-table th { background: var(--gs-canvas); padding: 14px 16px; font-size: 11px; font-weight: 600; color: var(--gs-slate); border-bottom: 1px solid var(--gs-border); }
.gs-table td { padding: 14px 16px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }

/* Footer */
.gs-footer { background: var(--gs-navy); color: #CBD5E1; padding: 56px 0 28px; }
.gs-footer-grid { display: grid; grid-template-columns: 5fr 4fr 3fr; gap: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(255,255,255,0.12); }
.gs-footer h4 { color: #FFFFFF; font-size: 14px; margin: 0 0 12px; }
.gs-footer p, .gs-footer a { font-size: 13px; color: #94A3B8; margin: 0 0 8px; display: block; }
.gs-footer a:hover { color: #FFFFFF; }
.gs-copyright { text-align: center; font-size: 12px; color: #94A3B8; padding-top: 20px; }

@media (max-width: 960px) {
  .gs-nav { display: none; }
  .gs-hero-copy, .gs-hero-media { grid-column: span 12; }
  .gs-services { grid-template-columns: repeat(2, 1fr); }
  .gs-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .gs-grid-2, .gs-pkg, .gs-footer-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .gs-services, .gs-grid-3 { grid-template-columns: 1fr; }
}
</style>`;
}

export function generateGoDaddyEmbedSnippet(options: GoDaddyExportOptions): string {
  const { assetBaseUrl, bookingActionUrl, includeBillboards, includeFlights } = options;
  const heroImg = resolveUrl(assetBaseUrl, HERO_AVIATION_IMAGE);
  const logoImg = resolveUrl(assetBaseUrl, AGENCY_BRAND_LOGO);
  const bookingHref = escapeHtml(bookingActionUrl || 'mailto:travelaviation@giftstartravellc.com');

  const servicesHtml = CORE_SERVICES.map(
    (s) => `      <div>
        <p class="gs-service-num gs-mono">${escapeHtml(s.number)}.</p>
        <h3 class="gs-service-title gs-display">${escapeHtml(s.title)}</h3>
        <p class="gs-service-desc">${escapeHtml(s.description)}</p>
      </div>`
  ).join('\n');

  const destinationsHtml = DESTINATIONS.map(
    (d) => `      <article class="gs-card">
        <div class="gs-card-img-wrap">
          <img src="${escapeHtml(resolveUrl(assetBaseUrl, d.image))}" alt="${escapeHtml(d.name)}" />
          <div class="gs-card-img-caption">
            <div>
              <p class="gs-mono" style="margin:0;font-size:11px;color:#BAE6FD;">${escapeHtml(d.airportCode)} · ${escapeHtml(d.flightTimeFromJub)}</p>
              <h3 class="gs-display" style="margin:2px 0 0;font-size:20px;">${escapeHtml(d.name)}</h3>
            </div>
            <span class="gs-price-tag gs-mono">From $${d.startingPriceUsd.toLocaleString()}</span>
          </div>
        </div>
        <div class="gs-card-body">
          <div>
            <p style="margin:0 0 6px;font-size:12px;color:#64748B;">${escapeHtml(d.country)} · Best ${escapeHtml(d.bestSeason)}</p>
            <p style="margin:0;font-size:14px;color:#475569;">${escapeHtml(d.tagline)}</p>
          </div>
          <a href="${bookingHref}" class="gs-btn-outline" style="padding:9px 14px;font-size:12px;">Inquire About ${escapeHtml(d.name)} →</a>
        </div>
      </article>`
  ).join('\n');

  const packagesHtml = TOUR_PACKAGES.map(
    (p) => `      <article class="gs-pkg">
        <div class="gs-pkg-img">
          <img src="${escapeHtml(resolveUrl(assetBaseUrl, p.image))}" alt="${escapeHtml(p.title)}" />
        </div>
        <div class="gs-pkg-body">
          <div>
            <p class="gs-meta-line"><strong>${escapeHtml(p.tier)}</strong> · <span class="gs-mono">${p.durationDays} Days</span> · ${escapeHtml(p.destination)}</p>
            <h3 class="gs-display" style="margin:0 0 8px;font-size:20px;">${escapeHtml(p.title)}</h3>
            <p style="margin:0;font-size:13px;color:#475569;">${escapeHtml(p.summary)}</p>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #E2E8F0;padding-top:14px;">
            <div>
              <span style="display:block;font-size:11px;color:#64748B;">Per Traveler</span>
              <strong class="gs-mono" style="font-size:18px;">$${p.priceUsd.toLocaleString()}</strong>
            </div>
            <a href="${bookingHref}" class="gs-btn-navy" style="padding:9px 16px;font-size:12px;">Reserve Package</a>
          </div>
        </div>
      </article>`
  ).join('\n');

  const flightsSection = includeFlights
    ? `\n  <section id="gs-flights" class="gs-section gs-section-muted">
    <div class="gs-container">
      <p class="gs-eyebrow">Live Dispatch & Partner Carriers</p>
      <h2 class="gs-h2 gs-display">Scheduled Routes & Giftstar Air Charter</h2>
      <p class="gs-sub">Direct ticketing and bespoke charter operations departing Juba International Airport (JUB).</p>
      <div class="gs-table-wrap">
        <table class="gs-table">
          <thead>
            <tr>
              <th>Carrier & Flight</th>
              <th>Corridor</th>
              <th>Schedule</th>
              <th>Aircraft</th>
              <th style="text-align:right;">Economy</th>
              <th style="text-align:right;">Business / Charter</th>
            </tr>
          </thead>
          <tbody>
${FLIGHT_ROUTES.map(
  (f) => `            <tr>
              <td><strong>${escapeHtml(f.airline)}</strong><br /><span class="gs-mono" style="font-size:11px;color:#64748B;">${escapeHtml(f.flightNumber)} · ${escapeHtml(f.frequency)}</span></td>
              <td class="gs-mono"><strong>${escapeHtml(f.originCode)} → ${escapeHtml(f.destinationCode)}</strong><br /><span style="font-family:inherit;font-size:11px;color:#64748B;">${escapeHtml(f.originCity)} to ${escapeHtml(f.destinationCity)}</span></td>
              <td class="gs-mono">${escapeHtml(f.departureTime)} – ${escapeHtml(f.arrivalTime)}<br /><span style="font-size:11px;color:#64748B;">${escapeHtml(f.duration)}</span></td>
              <td>${escapeHtml(f.aircraft)}</td>
              <td class="gs-mono" style="text-align:right;font-weight:600;">$${f.economyUsd.toLocaleString()}</td>
              <td class="gs-mono" style="text-align:right;font-weight:600;color:#0D74CE;">$${f.businessUsd.toLocaleString()}</td>
            </tr>`
).join('\n')}
          </tbody>
        </table>
      </div>
    </div>
  </section>`
    : '';

  const billboardsSection = includeBillboards
    ? `\n  <section id="gs-gallery" class="gs-section">
    <div class="gs-container">
      <p class="gs-eyebrow">Outdoor Billboards & Brand Campaigns</p>
      <h2 class="gs-h2 gs-display">Giftstar Brand Showcase Across Juba & East Africa</h2>
      <p class="gs-sub">Our signature billboard campaigns and aviation identity connecting South Sudan to the world.</p>
      <div class="gs-grid-3">
${BILLBOARD_GALLERY.map(
  (b) => `        <article class="gs-card">
          <div class="gs-card-img-wrap">
            <img src="${escapeHtml(resolveUrl(assetBaseUrl, b.image))}" alt="${escapeHtml(b.title)}" />
          </div>
          <div class="gs-card-body">
            <div>
              <p class="gs-meta-line"><strong>${escapeHtml(b.projectType)}</strong> · ${escapeHtml(b.location)}</p>
              <h3 class="gs-display" style="margin:0 0 8px;font-size:18px;">${escapeHtml(b.title)}</h3>
              <p style="margin:0;font-size:13px;color:#475569;">${escapeHtml(b.caption)}</p>
            </div>
          </div>
        </article>`
).join('\n')}
      </div>
    </div>
  </section>`
    : '';

  return `${buildScopedStyles()}
<div class="gs-root">
  <header class="gs-header">
    <div class="gs-container gs-header-inner">
      <a href="#gs-top" class="gs-brand">Giftstar Travel Aviation</a>
      <nav class="gs-nav">
        <a href="#gs-destinations">Destinations</a>
        <a href="#gs-packages">Packages</a>
        ${includeFlights ? '<a href="#gs-flights">Flights</a>' : ''}
        ${includeBillboards ? '<a href="#gs-gallery">Billboards</a>' : ''}
        <a href="#gs-contact">Contact</a>
      </nav>
      <a href="${bookingHref}" class="gs-btn-primary">Book Journey</a>
    </div>
  </header>

  <section id="gs-top" class="gs-hero">
    <div class="gs-container">
      <div class="gs-hero-grid">
        <div class="gs-hero-copy">
          <div>
            <p class="gs-eyebrow">Juba, Airport Road · From Junub To The World</p>
            <h1 class="gs-h1 gs-display">Precision Aviation &amp; Bespoke Global Travel</h1>
            <p class="gs-lead">
              Direct airline ticketing across 15+ international carriers, executive air charters, 48-hour visa processing, and curated luxury itineraries from South Sudan to Dubai, East Africa, and Europe.
            </p>
            <div class="gs-cta-row">
              <a href="${bookingHref}" class="gs-btn-navy">Plan &amp; Book Journey →</a>
              <a href="#gs-destinations" class="gs-btn-outline">Explore Destinations</a>
            </div>
          </div>
          <div class="gs-stats">
            <div><p class="gs-stat-val gs-mono">15+</p><p class="gs-stat-lbl">Partner Airlines</p></div>
            <div><p class="gs-stat-val gs-mono">48h</p><p class="gs-stat-lbl">UAE Visa Turnaround</p></div>
            <div><p class="gs-stat-val gs-mono">24/7</p><p class="gs-stat-lbl">Juba Charter Dispatch</p></div>
          </div>
        </div>
        <div class="gs-hero-media">
          <img src="${escapeHtml(heroImg)}" alt="Giftstar Travel Aviation luxury commercial jet" />
          <div class="gs-hero-overlay">
            <div>
              <span style="font-size:12px;color:#BAE6FD;">JUB International Dispatch</span>
              <p class="gs-display" style="margin:4px 0 0;font-size:20px;font-weight:600;">Commercial Ticketing &amp; Private Charter</p>
            </div>
            <a href="${bookingHref}" class="gs-btn-outline" style="padding:8px 14px;font-size:12px;">Request Quote</a>
          </div>
        </div>
      </div>

      <div class="gs-services">
${servicesHtml}
      </div>
    </div>
  </section>

  <div class="gs-airlines">
    <div class="gs-container gs-airlines-inner">
      <strong style="color:#0B1F3A;">Airline Alliances</strong>
      <span>${escapeHtml(PARTNER_AIRLINES.slice(0, 10).join('  ·  '))}</span>
    </div>
  </div>

  <section id="gs-destinations" class="gs-section">
    <div class="gs-container">
      <p class="gs-eyebrow">Curated Corridors</p>
      <h2 class="gs-h2 gs-display">Signature Destinations Connected From Juba</h2>
      <p class="gs-sub">Direct airline connections, visa coordination, and bespoke hotel stays across East Africa, the Gulf, and the Mediterranean.</p>
      <div class="gs-grid-3">
${destinationsHtml}
      </div>
    </div>
  </section>

  <section id="gs-packages" class="gs-section gs-section-white">
    <div class="gs-container">
      <p class="gs-eyebrow">Turnkey Journeys</p>
      <h2 class="gs-h2 gs-display">Curated Luxury Tour Packages</h2>
      <p class="gs-sub">Complete aviation, visa, transfer, and five-star sanctuary packages curated by our Juba Airport Road concierge desk.</p>
      <div class="gs-grid-2">
${packagesHtml}
      </div>
    </div>
  </section>${flightsSection}${billboardsSection}

  <footer id="gs-contact" class="gs-footer">
    <div class="gs-container">
      <div class="gs-footer-grid">
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <img src="${escapeHtml(logoImg)}" alt="Giftstar Travel Aviation Logo" style="height:48px;width:auto;background:#FFFFFF;padding:4px;border-radius:8px;" />
            <div>
              <strong class="gs-display" style="color:#FFFFFF;font-size:18px;display:block;">Giftstar Travel Aviation</strong>
              <span style="font-size:12px;color:#BAE6FD;">From Junub To The World</span>
            </div>
          </div>
          <p>Full-service aviation ticketing, air charter dispatch, visa processing, migration &amp; study abroad advisory, luxury hotels, and East African safaris.</p>
        </div>
        <div>
          <h4>Juba Head Office</h4>
          <p>Juba, Airport Road, South Sudan</p>
          <p class="gs-mono">+211 989 991 000 / +211 920 548 083</p>
          <a href="mailto:travelaviation@giftstartravellc.com">travelaviation@giftstartravellc.com</a>
        </div>
        <div>
          <h4>Quick Links</h4>
          <a href="#gs-destinations">Destinations</a>
          <a href="#gs-packages">Tour Packages</a>
          <a href="${bookingHref}">AI Trip Planner &amp; Booking Portal</a>
        </div>
      </div>
      <div class="gs-copyright">© ${new Date().getFullYear()} Giftstar Travel Aviation. All rights reserved.</div>
    </div>
  </footer>
</div>`;
}

export function generateGoDaddyFullHtmlDocument(options: GoDaddyExportOptions): string {
  const bodySnippet = generateGoDaddyEmbedSnippet(options);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Giftstar Travel Aviation | From Junub To The World</title>
    <meta name="description" content="Luxury aviation ticketing, private air charters, visa processing, safaris, and curated tour packages from Juba Airport Road to Dubai, East Africa, and Europe." />
    <style>
      html, body { margin: 0; padding: 0; background: #FAFBFD; }
    </style>
  </head>
  <body>
${bodySnippet}
  </body>
</html>
`;
}
