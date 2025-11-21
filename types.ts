
export enum TopikLevel {
  BEGINNER = 'Beginner', // TOPIK I (Levels 1-2)
  INTERMEDIATE = 'Intermediate', // TOPIK II (Levels 3-4)
  ADVANCED = 'Advanced', // TOPIK II (Levels 5-6)
  UNDEFINED = 'Undefined'
}

export interface WordAnalysis {
  word: string; // The specific conjugated form found in text
  original: string; // Dictionary form
  pronunciation: string;
  hanja: string | null;
  pos: string; // Part of speech
  level: TopikLevel;
  meaning: string;
  example: string;
  exampleTranslation: string; // Added translation for the example sentence
  usageNote: string; // Conjugation or usage details
}

export interface AnalyzedSentence {
  koreanText: string;
  translation: string;
  words: WordAnalysis[];
}

export interface AppSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
}

export interface VocabItem extends WordAnalysis {
  id: string;
  dateAdded: number;
}

export interface IdolQuote {
  idolName: string;
  koreanQuote: string;
  translation: string;
  context: string;
  keywords: WordAnalysis[];
}

export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'en', name: 'English' },
  { code: 'ko', name: 'Korean' },
  { code: 'ja', name: 'Japanese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ru', name: 'Russian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' }
];
