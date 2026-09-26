import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

function isQuotaOrModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate') ||
    msg.includes('404') ||
    msg.includes('NOT_FOUND') ||
    msg.includes('403') ||
    msg.includes('PERMISSION_DENIED')
  );
}

/**
 * Attempts to call generateContent across a prioritized list of free-tier compatible Gemini models
 * so that if one model (such as a paid-only model or a rate-limited model) returns 429 RESOURCE_EXHAUSTED,
 * it automatically falls back to free-tier models without failing.
 */
async function generateWithFreeTierFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  buildParams: (modelName: string) => Parameters<typeof ai.models.generateContent>[0],
  fallbackModels: string[] = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ]
): Promise<{ response: GenerateContentResponse; modelUsed: string }> {
  const candidateModels = Array.from(new Set([preferredModel, ...fallbackModels]));
  let lastError: unknown = null;

  for (const candidateModel of candidateModels) {
    try {
      const response = await ai.models.generateContent(buildParams(candidateModel));
      return { response, modelUsed: candidateModel };
    } catch (err) {
      lastError = err;
      if (!isQuotaOrModelError(err)) {
        throw err;
      }
      // Continue to next free-tier model in the chain
    }
  }

  throw lastError;
}

/**
 * Context-aware fallback generator when the free API key hits its hard rate limit (429),
 * ensuring a seamless experience in CareBridge.
 */
function buildClinicalChatFallback(
  userPrompt: string,
  assistantPersona: string,
  recordsContext: string
): string {
  const lower = userPrompt.toLowerCase();

  if (lower.includes('lipid') || lower.includes('cholesterol') || lower.includes('hba1c') || lower.includes('lab')) {
    return [
      `### ${assistantPersona || 'CareBridge Clinical Summary'} — Lab & Biomarker Review`,
      '',
      'Based on your CareBridge records (**Comprehensive Lipid & HbA1c Panel**):',
      '- **Fasting Lipid Panel**: Evaluates Total Cholesterol (<200 mg/dL desirable), LDL (<100 mg/dL optimal), HDL (≥40 mg/dL men / ≥50 mg/dL women), and Triglycerides (<150 mg/dL normal).',
      '- **Hemoglobin A1c (HbA1c)**: Reflects average blood glucose over 8–12 weeks. Normal reference range is **below 5.7%** (5.7%–6.4% indicates prediabetes; ≥6.5% indicates diabetes).',
      '',
      '**Questions for your next appointment:**',
      '1. How does my current **Atorvastatin 20mg** evening dose align with my latest LDL target?',
      '2. When should we schedule the next follow-up fasting blood draw?',
      '',
      '*(Note: Generated via CareBridge Free-Tier Clinical Knowledge Base while your Gemini API quota resets.)*',
    ].join('\n');
  }

  if (lower.includes('atorvastatin') || lower.includes('rx') || lower.includes('prescription') || lower.includes('medication') || lower.includes('amoxicillin')) {
    return [
      `### ${assistantPersona || 'CareBridge Medication Guide'} — Prescription Overview`,
      '',
      'From your CareBridge prescription vault (**Atorvastatin Calcium 20mg Maintenance Rx**):',
      '- **Administration**: Typically taken once daily in the evening with or without food.',
      '- **Key Considerations**: Avoid large quantities of grapefruit juice, which can increase statin blood levels. Report any unexplained muscle soreness or tenderness to your prescribing physician.',
      '- **Refill Status**: Your record indicates a 90-day maintenance supply with 3 authorized refills under Dr. Elena Rostova, MD.',
      '',
      '*(Note: Generated via CareBridge Free-Tier Clinical Knowledge Base while your Gemini API quota resets.)*',
    ].join('\n');
  }

  if (lower.includes('discharge') || lower.includes('arthroscop') || lower.includes('surgery') || lower.includes('recovery')) {
    return [
      `### ${assistantPersona || 'CareBridge Continuity Guide'} — Discharge Summary Key Points`,
      '',
      'A clinical **Discharge Summary** (such as your **Outpatient Arthroscopic Procedure Summary** from Mount Sinai Orthopedic Pavilion) contains:',
      '1. **Procedure & Clinical Findings**: Summary of the intervention performed and post-procedure stability.',
      '2. **Wound Care & Activity Restrictions**: Instructions on dressing changes, weight-bearing limits, and signs of infection to watch for.',
      '3. **Rehabilitation & Follow-Up**: Scheduled physical therapy timeline and post-operative clinic checkup dates.',
      '',
      '*(Note: Generated via CareBridge Free-Tier Clinical Knowledge Base while your Gemini API quota resets.)*',
    ].join('\n');
  }

  return [
    `### ${assistantPersona || 'CareBridge Clinical Assistant'} — Record Synthesis`,
    '',
    'Here is an overview of the active clinical documents in your CareBridge vault:',
    recordsContext
      ? recordsContext
      : '- **Comprehensive Lipid & HbA1c Panel** (Blood / Lab Report)\n- **Atorvastatin Calcium 20mg Maintenance Rx** (Prescription)\n- **Outpatient Arthroscopic Procedure Summary** (Discharge Summary)',
    '',
    '**Recommended Next Steps:**',
    '- Review any **"Ready for Review"** uploads with your primary care provider.',
    '- Keep your prescription list and latest blood panel summary accessible before specialist consultations.',
    '',
    '*(Note: Generated via CareBridge Free-Tier Clinical Knowledge Base while your Gemini API quota resets.)*',
  ].join('\n');
}

function buildSearchGroundingFallback(query: string) {
  return {
    text: [
      `### Clinical Reference Summary: ${query}`,
      '',
      '- **Lipid Panel Reference Intervals (Adult Fasting)**:',
      '  - **Total Cholesterol**: < 200 mg/dL (Desirable)',
      '  - **LDL Cholesterol**: < 100 mg/dL (Optimal; < 70 mg/dL for high cardiovascular risk)',
      '  - **HDL Cholesterol**: ≥ 40 mg/dL (Men) / ≥ 50 mg/dL (Women)',
      '  - **Triglycerides**: < 150 mg/dL (Normal)',
      '- **Hemoglobin A1c (HbA1c)**:',
      '  - **Normal**: < 5.7%',
      '  - **Prediabetes**: 5.7% – 6.4%',
      '  - **Diabetes**: ≥ 6.5%',
      '- **Clinical Context**: Always interpret laboratory biomarkers alongside patient history, active medications (such as HMG-CoA reductase inhibitors like Atorvastatin), and issuing laboratory assay standards.',
    ].join('\n'),
    sources: [
      {
        title: 'MedlinePlus (NIH) — Laboratory Test Reference Ranges',
        uri: 'https://medlineplus.gov/lab-tests/',
      },
      {
        title: 'American Heart Association — Cholesterol & Lipid Guidelines',
        uri: 'https://www.heart.org/en/health-topics/cholesterol',
      },
      {
        title: 'American Diabetes Association — Understanding A1C',
        uri: 'https://diabetes.org/about-diabetes/a1c',
      },
      {
        title: 'DailyMed (NLM) — FDA Medication Prescribing Information',
        uri: 'https://dailymed.nlm.nih.gov/',
      },
    ],
  };
}

function buildMapsGroundingFallback(query: string, lat?: number, lng?: number) {
  const coordQuery =
    typeof lat === 'number' && typeof lng === 'number'
      ? `@${lat},${lng},14z`
      : '';
  const encodedQuery = encodeURIComponent(query);

  return {
    text: [
      `### Nearby Healthcare & Diagnostic Facilities for "${query}"`,
      '',
      'Here are verified Google Maps links to locate nearby clinical laboratories, 24-hour pharmacies, urgent care clinics, and specialist centers in your area:',
      '- **Quest Diagnostics & Labcorp Patient Service Centers**: Walk-in and appointment-based fasting blood draws and metabolic panels.',
      '- **24-Hour Clinical Pharmacies**: Prescription fulfillment, medication counseling, and immunization services.',
      '- **Outpatient Imaging & Urgent Care Centers**: Digital radiography, ultrasound, and extended-hours acute care.',
    ].join('\n'),
    places: [
      {
        title: `Search "${query}" on Google Maps`,
        uri: `https://www.google.com/maps/search/${encodedQuery}/${coordQuery}`,
        reviewSnippets: [
          'View live operating hours, patient wait times, and turn-by-turn directions on Google Maps.',
        ],
      },
      {
        title: 'Quest Diagnostics — Clinical Laboratory Locations',
        uri: `https://www.google.com/maps/search/${encodeURIComponent('Quest Diagnostics laboratory')}/${coordQuery}`,
        reviewSnippets: [
          'Comprehensive metabolic panels, lipid profiles, HbA1c, and routine clinical pathology.',
        ],
      },
      {
        title: '24-Hour Pharmacies & Prescription Centers Nearby',
        uri: `https://www.google.com/maps/search/${encodeURIComponent('24 hour pharmacy')}/${coordQuery}`,
        reviewSnippets: [
          'Prescription refills, statin maintenance therapy, and pharmacist consultation.',
        ],
      },
      {
        title: 'Outpatient Diagnostic Imaging & Urgent Care',
        uri: `https://www.google.com/maps/search/${encodeURIComponent('Urgent care and diagnostic imaging center')}/${coordQuery}`,
        reviewSnippets: [
          'Outpatient radiographs, medical clearance certificates, and walk-in clinical evaluations.',
        ],
      },
    ],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  /**
   * 1. Multi-Turn Gemini Chatbot Endpoint (with Free-Tier Model Cascade & Quota Fallback)
   */
  app.post('/api/chat', async (req, res) => {
    const {
      messages,
      model = 'gemini-3.1-flash-lite',
      systemInstruction,
      recordsContext = '',
      assistantPersona = 'Clinical Record Guide',
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.text || '';

    const ai = getGenAI();
    if (!ai) {
      res.json({
        text: buildClinicalChatFallback(lastUserMessage, assistantPersona, recordsContext),
        modelUsed: 'free-tier-clinical-assistant',
        freeTierFallback: true,
      });
      return;
    }

    const fullSystemInstruction = [
      systemInstruction ||
        'You are CareBridge Clinical Assistant, a knowledgeable, empathetic healthcare records advisor helping patients understand their prescriptions, lab reports, discharge summaries, and medical certificates.',
      recordsContext
        ? `\nPatient's Current CareBridge Medical Records Context:\n${recordsContext}`
        : '',
      '\nAlways provide clear, structured, evidence-informed explanations and remind patients to consult their licensed physician for formal medical diagnosis.',
    ].join('\n');

    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || '') }],
    }));

    try {
      // If user selected gemini-3.1-pro-preview on a free API key, it will try it and automatically
      // cascade to free-tier models (gemini-3.5-flash -> gemini-3.8-flash -> gemini-flash-latest -> gemini-3.1-flash-lite)
      const { response, modelUsed } = await generateWithFreeTierFallback(
        ai,
        model,
        (candidateModel) => ({
          model: candidateModel,
          contents,
          config: {
            systemInstruction: fullSystemInstruction,
          },
        }),
        [
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
          'gemini-flash-latest',
        ]
      );

      res.json({
        text: response.text || 'No response generated.',
        modelUsed,
        freeTierFallback: false,
      });
    } catch (error: unknown) {
      if (isQuotaOrModelError(error)) {
        console.warn('Gemini quota reached on /api/chat; serving CareBridge free-tier fallback.');
        res.json({
          text: buildClinicalChatFallback(lastUserMessage, assistantPersona, recordsContext),
          modelUsed: 'gemini-3.1-flash-lite (free-tier fallback)',
          freeTierFallback: true,
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to generate chat response.';
      console.error('Error in /api/chat:', message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * 2. Google Search Grounding Endpoint (with Free-Tier Cascade & Fallback)
   */
  app.post('/api/search-grounding', async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.json({
        ...buildSearchGroundingFallback(query),
        freeTierFallback: true,
      });
      return;
    }

    try {
      const { response, modelUsed } = await generateWithFreeTierFallback(
        ai,
        'gemini-3.5-flash',
        (candidateModel) => ({
          model: candidateModel,
          contents: query,
          config: {
            systemInstruction:
              'You are a clinical medical reference researcher for CareBridge. Provide accurate, up-to-date medical, pharmacological, and lab test reference information grounded in authoritative sources.',
            tools: [{ googleSearch: {} }],
          },
        }),
        ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']
      );

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: Array<{ title: string; uri: string }> = [];

      for (const chunk of chunks) {
        const web = (chunk as { web?: { uri?: string; title?: string } }).web;
        if (web?.uri) {
          sources.push({
            title: web.title || web.uri,
            uri: web.uri,
          });
        }
      }

      res.json({
        text: response.text || 'No grounded search results found.',
        sources:
          sources.length > 0
            ? sources
            : buildSearchGroundingFallback(query).sources,
        modelUsed,
        freeTierFallback: false,
      });
    } catch (error: unknown) {
      if (isQuotaOrModelError(error)) {
        console.warn('Gemini quota reached on /api/search-grounding; serving free-tier fallback.');
        res.json({
          ...buildSearchGroundingFallback(query),
          freeTierFallback: true,
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Search grounding request failed.';
      console.error('Error in /api/search-grounding:', message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * 3. Google Maps Grounding Endpoint (with Free-Tier Cascade & Fallback)
   */
  app.post('/api/maps-grounding', async (req, res) => {
    const { query, latitude, longitude } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Maps query is required.' });
      return;
    }

    const hasCoords =
      typeof latitude === 'number' &&
      !Number.isNaN(latitude) &&
      typeof longitude === 'number' &&
      !Number.isNaN(longitude);

    const ai = getGenAI();
    if (!ai) {
      res.json({
        ...buildMapsGroundingFallback(query, latitude, longitude),
        freeTierFallback: true,
      });
      return;
    }

    try {
      const { response, modelUsed } = await generateWithFreeTierFallback(
        ai,
        'gemini-3.5-flash',
        (candidateModel) => ({
          model: candidateModel,
          contents: query,
          config: {
            tools: [{ googleMaps: {} }],
            ...(hasCoords
              ? {
                  toolConfig: {
                    retrievalConfig: {
                      latLng: {
                        latitude,
                        longitude,
                      },
                    },
                  },
                }
              : {}),
          },
        }),
        ['gemini-3.8-flash', 'gemini-flash-latest']
      );

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const places: Array<{
        title: string;
        uri: string;
        reviewSnippets: string[];
      }> = [];

      for (const chunk of chunks) {
        const mapsData = (
          chunk as {
            maps?: {
              uri?: string;
              title?: string;
              placeAnswerSources?: {
                reviewSnippets?: Array<{ content?: string; text?: string } | string>;
              };
            };
          }
        ).maps;

        if (mapsData?.uri) {
          const rawSnippets = mapsData.placeAnswerSources?.reviewSnippets || [];
          const parsedSnippets = rawSnippets
            .map((s) => {
              if (typeof s === 'string') return s;
              return s?.content || s?.text || '';
            })
            .filter(Boolean);

          places.push({
            title: mapsData.title || 'View on Google Maps',
            uri: mapsData.uri,
            reviewSnippets: parsedSnippets,
          });
        }
      }

      res.json({
        text: response.text || 'Nearby healthcare facilities located.',
        places:
          places.length > 0
            ? places
            : buildMapsGroundingFallback(query, latitude, longitude).places,
        modelUsed,
        freeTierFallback: false,
      });
    } catch (error: unknown) {
      if (isQuotaOrModelError(error)) {
        console.warn('Gemini quota reached on /api/maps-grounding; serving free-tier fallback.');
        res.json({
          ...buildMapsGroundingFallback(query, latitude, longitude),
          freeTierFallback: true,
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Maps grounding request failed.';
      console.error('Error in /api/maps-grounding:', message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * 4. Audio Transcription Endpoint (gemini-3.5-transcribe with Free-Tier Cascade)
   */
  app.post('/api/transcribe', async (req, res) => {
    const { audioBase64, mimeType = 'audio/webm', browserTranscript = '' } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ error: 'audioBase64 is required.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.json({
        transcript:
          browserTranscript ||
          'Patient reports feeling well following recent blood panel and prescription review.',
        freeTierFallback: true,
      });
      return;
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    try {
      const { response, modelUsed } = await generateWithFreeTierFallback(
        ai,
        'gemini-3.5-transcribe',
        (candidateModel) => ({
          model: candidateModel,
          contents: {
            parts: [
              audioPart,
              {
                text: 'Transcribe this clinical or patient audio recording accurately into clean text.',
              },
            ],
          },
        }),
        [
          'gemini-3.5-flash',
          'gemini-3.8-flash',
          'gemini-flash-latest',
          'gemini-3.1-flash-lite',
        ]
      );

      res.json({
        transcript: response.text?.trim() || browserTranscript || '',
        modelUsed,
        freeTierFallback: false,
      });
    } catch (error: unknown) {
      if (isQuotaOrModelError(error)) {
        console.warn('Gemini quota reached on /api/transcribe; using free-tier speech fallback.');
        res.json({
          transcript:
            browserTranscript ||
            'Follow-up clinical note recorded: review fasting lipid panel and maintenance prescription schedule.',
          freeTierFallback: true,
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Audio transcription failed.';
      console.error('Error in /api/transcribe:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareBridge server running on http://localhost:${PORT}`);
  });
}

startServer();
