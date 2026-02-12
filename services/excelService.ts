import { ApplicationData } from '../types';

const API_BASE = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE || '';

export const submitToExcel = async (data: ApplicationData): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/api/public/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error('[submit] failed', response.status, message);
      return false;
    }

    const result = await response.json();
    if (result?.duplicate) {
      console.warn('[submit] duplicate detected', result.duplicate_of || null);
    }
    return true;
  } catch (error) {
    console.error('[submit] network error', error);
    return false;
  }
};
