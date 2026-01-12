import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

/**
 * AI Service for generating niche keyword ideas using Google Gemini API.
 */

/**
 * Generates niche keyword ideas using Google Gemini API.
 * @returns Array of generated keyword strings.
 * @throws Error if Gemini API call fails.
 */
export async function generateNicheIdeas(): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  const prompt =
    "Give me 5 unique, niche, micro-SaaS tool ideas or developer utility keywords (e.g., 'svg to jsx', 'json validator', 'pdf merger'). Return ONLY the keywords separated by commas.";

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse comma-separated keywords from response
  // Also handle newlines and numbered list formats
  const keywords = text
    .replace(/\n/g, ',')
    .replace(/^\d+\.\s*/gm, '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0 && keyword.length < 100);

  if (keywords.length === 0) {
    throw new Error('Gemini returned no valid keywords');
  }

  console.log(`🤖 Gemini generated ${keywords.length} keyword ideas`);
  return keywords;
}
