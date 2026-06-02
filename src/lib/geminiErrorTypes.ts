/** Minimal shapes for @google/genai errors without using `any`. */
export interface GeminiErrorWithResponse {
  response?: {
    candidates?: Array<{ finishReason?: string }>;
  };
}

export interface GeminiErrorWithStatus {
  status?: number;
}

export function getResponseFromGeminiError(
  error: object,
): GeminiErrorWithResponse['response'] | undefined {
  if ('response' in error) {
    const response = (error as GeminiErrorWithResponse).response;
    return response;
  }
  return undefined;
}

export function getStatusFromGeminiError(error: object): number | undefined {
  if ('status' in error) {
    return (error as GeminiErrorWithStatus).status;
  }
  return undefined;
}
