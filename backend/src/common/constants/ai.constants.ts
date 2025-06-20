export const AI_CONSTANTS = {
  MODEL_NAME: 'gpt-4',
  MAX_TOKENS: 150,
  TEMPERATURE: 0.7,
  CONFIDENCE_THRESHOLD: 0.8,
  DELAY_PREDICTION_PROMPT: 'Based on the maintenance event details, predict potential delays in minutes:',
} as const; 