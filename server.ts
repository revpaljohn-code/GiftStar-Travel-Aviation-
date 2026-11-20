import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'giftstar-travel-aviation' });
  });

  app.get('/api/maps/key', (_req: Request, res: Response) => {
    const key = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey: key });
  });

  app.post('/api/ai/plan-trip', async (req: Request, res: Response) => {
    try {
      const {
        origin = 'Juba, South Sudan (JUB)',
        destination,
        budgetUsd,
        durationDays,
        groupSize,
        interests = [],
        travelStyle = 'Luxury & Comfort',
      } = req.body ?? {};

      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'Please specify a destination for your trip.' });
        return;
      }

      const days = Math.min(Math.max(Number(durationDays) || 5, 1), 14);
      const budget = Math.max(Number(budgetUsd) || 3500, 300);
      const travelers = Math.min(Math.max(Number(groupSize) || 2, 1), 30);
      const interestText = Array.isArray(interests) && interests.length > 0
        ? interests.join(', ')
        : 'Aviation comfort, cultural heritage, fine dining, sightseeing';

      const ai = getGeminiClient();

      const prompt = `Create a bespoke, realistic luxury travel itinerary for Giftstar Travel Aviation (headquartered in Juba, South Sudan — "From Junub To The World").
Origin: ${origin}
Destination: ${destination}
Duration: ${days} days
Total Group Budget: $${budget} USD for ${travelers} traveler(s)
Travel Style: ${travelStyle}
Interests: ${interestText}

Recommend realistic flight connections via Giftstar partner airlines (Ethiopian Airlines, Kenya Airways, Emirates, Qatar Airways, Turkish Airlines, Uganda Airlines, EgyptAir, flydubai, Tarco Air), realistic hotel tiers, visa/entry advisory, and day-by-day activities with realistic geographic coordinates (latitude and longitude) for key spots so the traveler can inspect the route.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the Lead Travel Architect at Giftstar Travel Aviation, a premier aviation and luxury travel agency based in Juba, Airport Road, South Sudan. Provide accurate, practical, luxurious, and culturally attuned travel plans.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Editorial title for the itinerary' },
              summary: { type: Type.STRING, description: 'Executive 2-3 sentence overview of the journey' },
              recommendedAirline: { type: Type.STRING, description: 'Best partner airline and routing from origin' },
              recommendedHotel: { type: Type.STRING, description: 'Recommended luxury or boutique hotel name and district' },
              visaAdvisory: { type: Type.STRING, description: 'Practical visa, transit, and airport transfer guidance' },
              estimatedBreakdown: {
                type: Type.OBJECT,
                properties: {
                  flightsUsd: { type: Type.NUMBER },
                  accommodationUsd: { type: Type.NUMBER },
                  experiencesAndDiningUsd: { type: Type.NUMBER },
                  transfersAndConciergeUsd: { type: Type.NUMBER },
                },
                required: ['flightsUsd', 'accommodationUsd', 'experiencesAndDiningUsd', 'transfersAndConciergeUsd'],
              },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: { type: Type.INTEGER },
                    theme: { type: Type.STRING },
                    morning: { type: Type.STRING },
                    afternoon: { type: Type.STRING },
                    evening: { type: Type.STRING },
                    highlightStop: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                      },
                      required: ['name', 'lat', 'lng'],
                    },
                  },
                  required: ['dayNumber', 'theme', 'morning', 'afternoon', 'evening', 'highlightStop'],
                },
              },
            },
            required: [
              'title',
              'summary',
              'recommendedAirline',
              'recommendedHotel',
              'visaAdvisory',
              'estimatedBreakdown',
              'days',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const itinerary = JSON.parse(rawText);
      res.json({ itinerary });
    } catch (error: unknown) {
      console.error('AI Trip Planner error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate trip itinerary.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/concierge', async (req: Request, res: Response) => {
    try {
      const { question } = req.body ?? {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Please enter a travel question.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: question,
        config: {
          systemInstruction:
            'You are a concise aviation and visa specialist at Giftstar Travel Aviation (Juba, Airport Road, South Sudan; Tel: +211 989 991 000 / +211 920 548 083; Email: travelaviation@giftstartravellc.com). Answer questions about airline ticketing, air charter services, visa processing, airport transfers, study abroad/migration, safaris, and hotel reservations clearly in 3-5 sentences.',
        },
      });

      res.json({ answer: response.text ?? 'Please contact our Juba desk for tailored assistance.' });
    } catch (error: unknown) {
      console.error('AI Concierge error:', error);
      const message = error instanceof Error ? error.message : 'Unable to reach travel advisor.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Giftstar Travel Aviation server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
