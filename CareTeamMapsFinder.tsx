import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Search,
  Loader2,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { AudioRecorderButton } from './AudioRecorderButton';

interface GroundedPlace {
  title: string;
  uri: string;
  reviewSnippets: string[];
}

const PRESET_CARE_QUERIES = [
  '24-hour pharmacies and prescription fulfillment centers nearby',
  'Diagnostic blood testing laboratories and Quest or Labcorp locations nearby',
  'Urgent care clinics and outpatient imaging centers nearby',
  'Cardiology and internal medicine specialists nearby',
];

export const CareTeamMapsFinder: React.FC = () => {
  const [query, setQuery] = useState(
    'Diagnostic blood testing laboratories and pharmacies near me'
  );
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Default (San Francisco, CA)');
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<string | null>(null);
  const [places, setPlaces] = useState<GroundedPlace[]>([]);

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoords({ latitude: lat, longitude: lng });
        setLocationLabel(`${lat}, ${lng}`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setError('Unable to retrieve device location. Using default coordinates.');
      },
      { timeout: 8000 }
    );
  };

  const executeMapsSearch = async (customQuery?: string) => {
    const q = (customQuery ?? query).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          latitude: coords?.latitude ?? 37.78193,
          longitude: coords?.longitude ?? -122.40476,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Maps search failed.');
      }

      setAnswerText(data.text || '');
      setPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Google Maps data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-teal-600 via-sky-600 to-teal-500" />
      <div className="p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
              <span>Google Maps Grounding</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">gemini-3.5-flash</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Care Network & Diagnostic Facility Locator
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Find nearby pharmacies, blood draw laboratories, imaging centers, and clinical specialists grounded with live Google Maps place data.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleUseBrowserLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-teal-600" />
              )}
              <span>Use My Location</span>
            </button>
            <span className="text-xs text-slate-400 font-mono tabular-nums hidden md:inline">
              {locationLabel}
            </span>
          </div>
        </div>

        {/* Search Bar + Voice Dictation */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeMapsSearch();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for nearby pharmacies, diagnostic labs, or specialists..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <AudioRecorderButton
              compact
              onTranscriptionComplete={(transcript) => {
                setQuery(transcript);
                executeMapsSearch(transcript);
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Find Care Locations</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Preset Facility Queries */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Quick searches:</span>
          </span>
          {PRESET_CARE_QUERIES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setQuery(preset);
                executeMapsSearch(preset);
              }}
              className="text-slate-600 hover:text-teal-700 hover:underline transition-colors cursor-pointer text-left"
            >
              {preset}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Maps Grounding Results */}
        {answerText && (
          <div className="space-y-5 pt-2 border-t border-slate-100">
            <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <h3 className="text-xs font-semibold text-slate-500 mb-2">
                Clinical Facility Overview
              </h3>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {answerText}
              </div>
            </div>

            {places.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700">
                  Verified Google Maps Locations ({places.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {places.map((place, idx) => (
                    <a
                      key={`${place.uri}-${idx}`}
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-4 rounded-xl border border-slate-200/90 bg-white hover:border-teal-500/70 hover:shadow-xs transition-all flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                            {place.title}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 shrink-0" />
                      </div>

                      {place.reviewSnippets.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {place.reviewSnippets.slice(0, 2).map((snippet, sIdx) => (
                            <p
                              key={sIdx}
                              className="text-xs text-slate-500 line-clamp-2 italic"
                            >
                              “{snippet}”
                            </p>
                          ))}
                        </div>
                      )}

                      <span className="text-xs font-medium text-teal-700 pt-1">
                        Open in Google Maps
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
