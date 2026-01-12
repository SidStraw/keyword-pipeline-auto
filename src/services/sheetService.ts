import axios from 'axios';
import { KeywordMetric } from '../types';
import { config } from '../config';

/**
 * Saves keyword metrics to Google Apps Script Web App via HTTP POST.
 * @param metrics - Array of KeywordMetric objects to save.
 */
export async function saveKeywords(metrics: KeywordMetric[]): Promise<void> {
  try {
    const response = await axios.post(
      config.gasWebAppUrl,
      {
        auth: config.myCustomApiKey,
        payload: metrics,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        maxRedirects: 5, // Handle 302 redirects automatically
      }
    );

    console.log(`Successfully saved ${metrics.length} keywords to the sheet`);
    console.log('GAS Response:', response.data);
  } catch (error) {
    console.error('Error saving keywords to sheet:', error);
    throw error;
  }
}
