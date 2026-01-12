import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

/**
 * AI Service for generating niche keyword ideas using Google Gemini API.
 */

/**
 * Generates niche keyword ideas using Google Gemini API.
 * @returns Array of generated keyword strings.
 */
export async function generateNicheIdeas(): Promise<string[]> {
  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt =
      "Give me 5 unique, niche, micro-SaaS tool ideas or developer utility keywords (e.g., 'svg to jsx', 'json validator', 'pdf merger'). Return ONLY the keywords separated by commas.";

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse comma-separated keywords from response
    const keywords = text
      .split(',')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

    console.log(`🤖 Gemini generated ${keywords.length} keyword ideas`);
    return keywords;
  } catch (error) {
    console.error('Error generating niche ideas with Gemini:', error);
    return [];
  }
}
