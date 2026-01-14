import axios, { AxiosError } from 'axios';

/**
 * Utility functions for error handling and common operations
 */

/**
 * Standardized error object with typed properties
 */
export interface ParsedError {
  message: string;
  status?: number;
  data?: unknown;
  isAxiosError: boolean;
}

/**
 * Parse an unknown error into a standardized error object
 * @param error - Unknown error from catch block
 * @returns Parsed error with standardized properties
 */
export function parseError(error: unknown): ParsedError {
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return {
      message: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      isAxiosError: true,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      isAxiosError: false,
    };
  }

  // Handle objects with message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errorObj = error as { message: string; status?: number; data?: unknown };
    return {
      message: errorObj.message,
      status: errorObj.status,
      data: errorObj.data,
      isAxiosError: false,
    };
  }

  // Fallback for unknown error types
  return {
    message: String(error),
    isAxiosError: false,
  };
}

/**
 * Log an error with consistent formatting
 * @param context - Context string describing where the error occurred
 * @param error - The error to log
 */
export function logError(context: string, error: unknown): void {
  const parsed = parseError(error);
  console.error(`❌ ${context}:`, parsed.message);
  
  if (parsed.status) {
    console.error(`  Status: ${parsed.status}`);
  }
  
  if (parsed.data) {
    console.error(`  Response:`, JSON.stringify(parsed.data, null, 2));
  }
}

/**
 * Delay utility for rate limiting and retries
 * @param ms - Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
