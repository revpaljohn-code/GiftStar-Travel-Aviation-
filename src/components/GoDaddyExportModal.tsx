import React, { useMemo, useState } from 'react';
import { Check, Code2, Copy, Download, Globe, Palette, Server, X } from 'lucide-react';
import {
  generateGoDaddyEmbedSnippet,
  generateGoDaddyFullHtmlDocument,
  GIFTSTAR_THEME_TOKENS,
} from '../lib/godaddyExport';

interface GoDaddyExportModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_SHARED_URL = 'https://ais-pre-tekvokbvl2k777h2ihipjb-1015246337528.europe-west2.run.app';

type ExportTab = 'builder' | 'cpanel' | 'tokens' | 'domain';

export const GoDaddyExportModal: React.FC<GoDaddyExportModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('builder');
  const [assetBaseUrl, setAssetBaseUrl] = useState<string>(DEFAULT_SHARED_URL);
  const [bookingActionUrl, setBookingActionUrl] = useState<string>(`${DEFAULT_SHARED_URL}/#portal`);
  const [includeBillboards, setIncludeBillboards] = useState<boolean>(true);
  const [includeFlights, setIncludeFlights] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const embedCode = useMemo(
    () =>
      generateGoDaddyEmbedSnippet({
        assetBaseUrl,
        bookingActionUrl,
        includeBillboards,
        includeFlights,
      }),
    [assetBaseUrl, bookingActionUrl, includeBillboards, includeFlights]
  );

  const fullDocumentCode = useMemo(
    () =>
      generateGoDaddyFullHtmlDocument({
        assetBaseUrl,
        bookingActionUrl,
        includeBillboards,
        includeFlights,
      }),
    [assetBaseUrl, bookingActionUrl, includeBillboards, includeFlights]
  );

  if (!open) return null;

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2500);
    } catch {
      // Fallback textarea copy if clipboard API is restricted
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2500);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([fullDocumentCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentCode =
    activeTab === 'builder'
      ? embedCode
      : activeTab === 'cpanel'
        ? fullDocumentCode
        : activeTab === 'tokens'
          ? GIFTSTAR_THEME_TOKENS
          : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1F3A]/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="godaddy-export-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-[#FAFBFD]">
          <div>
            <p className="text-xs font-medium text-[#0D74CE] mb-1">
              GoDaddy Transfer &amp; Deployment Kit
            </p>
            <h2
              id="godaddy-export-title"
              className="font-display text-2xl font-semibold text-[#0B1F3A]"
            >
              Copy Giftstar Design to Your GoDaddy Account
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GoDaddy export dialog"
            className="p-2 rounded-lg text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-200 flex flex-wrap gap-2 bg-white">
          {(
            [
              { id: 'builder', label: 'Website Builder HTML', icon: Code2 },
              { id: 'cpanel', label: 'cPanel Static (index.html)', icon: Server },
              { id: 'tokens', label: 'Theme Colors & Fonts', icon: Palette },
              { id: 'domain', label: 'Connect GoDaddy Domain', icon: Globe },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab !== 'domain' && activeTab !== 'tokens' && (
            <div className="bg-[#FAFBFD] border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="gd-asset-base"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Image Asset Base URL
                  </label>
                  <input
                    id="gd-asset-base"
                    type="text"
                    value={assetBaseUrl}
                    onChange={(e) => setAssetBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-200 rounded-lg"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setAssetBaseUrl(DEFAULT_SHARED_URL)}
                      className="text-[11px] text-[#0D74CE] hover:underline"
                    >
                      Use Live Hosted Assets
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setAssetBaseUrl('.')}
                      className="text-[11px] text-slate-600 hover:underline"
                    >
                      Use Relative (./) for cPanel Upload
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="gd-booking-url"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    &ldquo;Book Journey&rdquo; Destination Link
                  </label>
                  <input
                    id="gd-booking-url"
                    type="text"
                    value={bookingActionUrl}
                    onChange={(e) => setBookingActionUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-200 rounded-lg"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setBookingActionUrl(`${DEFAULT_SHARED_URL}/#portal`)}
                      className="text-[11px] text-[#0D74CE] hover:underline"
                    >
                      Link to Live Booking &amp; AI Portal
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setBookingActionUrl('mailto:travelaviation@giftstartravellc.com')
                      }
                      className="text-[11px] text-slate-600 hover:underline"
                    >
                      Direct Email Link
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFlights}
                    onChange={(e) => setIncludeFlights(e.target.checked)}
                    className="rounded border-slate-300 text-[#0D74CE]"
                  />
                  Include Flight Schedules &amp; Charter Table
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBillboards}
                    onChange={(e) => setIncludeBillboards(e.target.checked)}
                    className="rounded border-slate-300 text-[#0D74CE]"
                  />
                  Include Billboard Campaign Gallery
                </label>
              </div>
            </div>
          )}

          {activeTab === 'builder' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-sky-50/70 border border-sky-200/80 rounded-xl p-4 space-y-1.5">
                <p className="font-semibold text-[#0B1F3A]">
                  How to paste into GoDaddy Websites + Marketing:
                </p>
                <p>
                  1. Open your GoDaddy Website Editor, click <strong>Add Section</strong>, choose{' '}
                  <strong>Files &amp; Web → HTML</strong>, and click <strong>Add</strong>.
                </p>
                <p>
                  2. Click <strong>Copy HTML &amp; CSS Code</strong> below and paste it into the{' '}
                  <strong>Custom Code</strong> box on GoDaddy, then click <strong>Publish</strong>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cpanel' && (
            <div className="text-xs text-slate-600 bg-sky-50/70 border border-sky-200/80 rounded-xl p-4 space-y-1.5">
              <p className="font-semibold text-[#0B1F3A]">
                How to upload to GoDaddy Web Hosting (cPanel / File Manager):
              </p>
              <p>
                1. Click <strong>Download index.html</strong> below.
              </p>
              <p>
                2. In GoDaddy <strong>My Hosting → cPanel → File Manager</strong>, open{' '}
                <code className="font-mono-tabular bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  public_html/
                </code>{' '}
                and upload{' '}
                <code className="font-mono-tabular bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  index.html
                </code>
                .
              </p>
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Use these exact brand colors and fonts inside GoDaddy&apos;s{' '}
                <strong>Theme → Colors &amp; Fonts</strong> settings, or copy the CSS variables below.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Aviation Navy', hex: '#0B1F3A' },
                  { name: 'Sky Azure CTA', hex: '#0D74CE' },
                  { name: 'Champagne Gold', hex: '#C8923A' },
                  { name: 'Alabaster Canvas', hex: '#FAFBFD' },
                ].map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handleCopy(swatch.hex, swatch.hex)}
                    className="p-3 border border-slate-200 rounded-xl text-left hover:border-[#0D74CE] transition-colors"
                  >
                    <div
                      className="h-10 rounded-lg border border-slate-200 mb-2"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <p className="text-xs font-semibold text-[#0B1F3A]">{swatch.name}</p>
                    <p className="text-[11px] font-mono-tabular text-slate-500">
                      {copiedKey === swatch.hex ? 'Copied!' : swatch.hex}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'domain' ? (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="bg-[#FAFBFD] border border-slate-200 rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-[#0B1F3A]">
                  Keep AI Trip Planner, Google Maps, Firebase Auth &amp; Google Workspace Active on Your GoDaddy Domain
                </p>
                <p className="leading-relaxed">
                  GoDaddy Website Builder only hosts static HTML sections. To keep the live Gemini AI Concierge, Google Maps Explorer, Customer Booking Portal, and Gmail/Docs/Sheets sync running under your GoDaddy domain:
                </p>
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-500">Live Full-Stack App URL</p>
                    <p className="font-mono-tabular text-xs font-semibold text-[#0B1F3A] break-all">
                      {DEFAULT_SHARED_URL}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('live-url', DEFAULT_SHARED_URL)}
                    className="px-3 py-1.5 bg-[#0D74CE] text-white text-xs font-semibold rounded-lg hover:bg-[#095ca6] inline-flex items-center gap-1.5 shrink-0"
                  >
                    {copiedKey === 'live-url' ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied URL
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy App URL
                      </>
                    )}
                  </button>
                </div>

                <ol className="list-decimal pl-5 space-y-2 pt-1 leading-relaxed">
                  <li>
                    <strong>GoDaddy Domain Forwarding:</strong> In GoDaddy{' '}
                    <strong>Domain Portfolio → DNS → Forwarding</strong>, forward your domain (e.g.{' '}
                    <code className="font-mono-tabular bg-white px-1 py-0.5 border border-slate-200 rounded">
                      giftstartravellc.com
                    </code>
                    ) to the Live Full-Stack App URL above.
                  </li>
                  <li>
                    <strong>Firebase Authorized Domains:</strong> If you map a custom domain via Cloud Run / DNS CNAME, add your GoDaddy domain inside{' '}
                    <strong>Firebase Console → Authentication → Settings → Authorized domains</strong> so Google Sign-In works seamlessly.
                  </li>
                  <li>
                    <strong>Google Maps Referrer Rules:</strong> Add{' '}
                    <code className="font-mono-tabular bg-white px-1 py-0.5 border border-slate-200 rounded">
                      https://*.yourdomain.com/*
                    </code>{' '}
                    in Google Cloud Console API Key restrictions.
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#0B1F3A]">
                  {activeTab === 'builder'
                    ? 'Scoped GoDaddy Embed Code (HTML + CSS)'
                    : activeTab === 'cpanel'
                      ? 'Complete Standalone Document (index.html)'
                      : 'Giftstar Brand CSS Tokens'}
                </span>
                <div className="flex items-center gap-2">
                  {activeTab === 'cpanel' && (
                    <button
                      type="button"
                      onClick={handleDownloadHtml}
                      className="px-3.5 py-2 text-xs font-semibold text-[#0B1F3A] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0D74CE]" />
                      Download index.html
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopy(activeTab, currentCode)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0D74CE] rounded-lg hover:bg-[#095ca6] inline-flex items-center gap-1.5"
                  >
                    {copiedKey === activeTab ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        {activeTab === 'builder'
                          ? 'Copy HTML & CSS Code'
                          : activeTab === 'cpanel'
                            ? 'Copy Full HTML'
                            : 'Copy CSS Tokens'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                aria-label="Generated GoDaddy export code"
                value={currentCode}
                rows={11}
                onFocus={(e) => e.target.select()}
                className="w-full p-4 text-[11px] font-mono-tabular bg-[#0B1F3A] text-sky-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D74CE]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
