export interface NutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  fiber: string;
  sodium: string;
  sugar: string;
}

export type UserGoal = 'weight_loss' | 'muscle_gain' | 'diabetes' | 'low_carb' | 'vegan' | 'general';
export type AppStep = 'ONBOARDING' | 'SCAN_A' | 'SCAN_B' | 'ANALYZING' | 'RESULT';

export interface UserProfile {
  goal: UserGoal;
}

export interface ProductAnalysis {
  label: string; // "Produto A" or "Produto B"
  productName: string; // Extracted or generic name
  nutrition: NutritionalInfo;
  pros: string[];
  cons: string[];
}

export interface ComparisonResult {
  productA: ProductAnalysis;
  productB: ProductAnalysis;
  winner: 'A' | 'B' | 'Tie';
  verdict: string; // Detailed reason why
  healthScoreA: number; // 0-100 (General health)
  healthScoreB: number; // 0-100 (General health)
  goalFitReason: string; // Specific reason related to UserGoal
}

export interface ImageFile {
  id: string;
  base64: string;
  mimeType: string;
  previewUrl: string;
}