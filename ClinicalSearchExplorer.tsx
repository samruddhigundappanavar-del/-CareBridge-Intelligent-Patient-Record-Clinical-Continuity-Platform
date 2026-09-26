import React, { useState } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { AudioRecorderButton } from './AudioRecorderButton';

interface GroundedSource {
  title: string;
  uri: string;
}

const SAMPLE_CLINICAL_SEARCHES = [
  'Standard reference ranges for adult HbA1c and fasting lipid panel in 2026',
  'Atorvastatin 20mg common side effects and food interactions',
  'Post-discharge wound care and physical therapy timeline after knee arthroscopy',
  'Amoxicillin-clavulanate 875mg dosing guidelines and contraindications',
];

export const ClinicalSearchExplorer: React.FC = () => {
  const [query, setQuery] = useState(
    'Standard reference ranges for adult HbA1c and fasting lipid panel'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundedSource[]>([]);

  const handleSearch = async (customQuery?: string) => {
    const q = (customQuery ?? query).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Clinical search request failed.');
      }

      setResultText(data.text || '');
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute grounded search.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-sky-600 via-teal-600 to-teal-500" />
      <div className="p-6 sm:p-7 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <span>Google Search Grounding</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">gemini-3.5-flash</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Medical Evidence & Lab Biomarker Lookup
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Look up up-to-date clinical reference ranges, medication guidelines, and lab test interpretations grounded with live Google Search citations.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about a lab biomarker, prescription medication, or clinical guideline..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <AudioRecorderButton
              compact
              onTranscriptionComplete={(transcript) => {
                setQuery(transcript);
                handleSearch(transcript);
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
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Evidence</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Topics:</span>
          </span>
          {SAMPLE_CLINICAL_SEARCHES.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => {
                setQuery(topic);
                handleSearch(topic);
              }}
              className="text-slate-600 hover:text-teal-700 hover:underline transition-colors cursor-pointer text-left"
            >
              {topic}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resultText && (
          <div className="space-y-5 pt-2 border-t border-slate-100">
            <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <h3 className="text-xs font-semibold text-slate-500 mb-2">
                Grounded Clinical Synthesis
              </h3>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {resultText}
              </div>
            </div>

            {sources.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-700">
                  Verified Web Citations ({sources.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sources.map((src, index) => (
                    <a
                      key={`${src.uri}-${index}`}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200/90 bg-white hover:border-teal-500/70 transition-colors text-xs group"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-teal-700 truncate">
                        {src.title}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 shrink-0" />
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
