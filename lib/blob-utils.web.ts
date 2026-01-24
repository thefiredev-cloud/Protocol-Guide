/**
 * Blob utilities for Web platform
 * Handles Blob, FileReader, and binary data operations
 */

/**
 * Convert Blob to base64 string (Web)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch URI and convert to Blob (Web)
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch URI: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Convert URI to base64 (Web)
 */
export async function uriToBase64(uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  return blobToBase64(blob);
}

/**
 * Create FormData with file from Blob (Web)
 */
export function createFormDataWithBlob(
  blob: Blob,
  fieldName: string,
  filename: string
): FormData {
  const formData = new FormData();
  formData.append(fieldName, blob, filename);
  return formData;
}

/**
 * Create object URL from Blob (Web)
 */
export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke object URL (Web)
 */
export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if FileReader is available
 */
export function isFileReaderSupported(): boolean {
  return typeof FileReader !== "undefined";
}

/**
 * Check if Blob is supported
 */
export function isBlobSupported(): boolean {
  return typeof Blob !== "undefined";
}
