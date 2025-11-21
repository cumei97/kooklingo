
import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { TopikLevel, WordAnalysis, AnalyzedSentence, IdolQuote } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Schema for Word Analysis
const wordSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The word as it appears in the text" },
    original: { type: Type.STRING, description: "The dictionary form (lemma)" },
    pronunciation: { type: Type.STRING, description: "Phonetic pronunciation in Hangul" },
    hanja: { type: Type.STRING, description: "Hanja characters if applicable, else empty string" },
    pos: { type: Type.STRING, description: "Part of speech (e.g., Noun, Verb)" },
    level: { 
      type: Type.STRING, 
      enum: ["Beginner", "Intermediate", "Advanced", "Undefined"], 
      description: "TOPIK level classification. 'Beginner' for TOPIK I, 'Intermediate' for TOPIK II Level 3-4, 'Advanced' for TOPIK II Level 5-6." 
    },
    meaning: { type: Type.STRING, description: "Meaning in the user's requested language" },
    example: { type: Type.STRING, description: "A short example sentence using this word in Korean" },
    exampleTranslation: { type: Type.STRING, description: "Translation of the example sentence in the user's requested language" },
    usageNote: { type: Type.STRING, description: "Explanation of conjugation, grammar rule applied, or usage context in the user's requested language" },
  },
  required: ["word", "original", "level", "meaning", "pronunciation", "example", "exampleTranslation"],
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    koreanText: { type: Type.STRING, description: "The full Korean text (translated if necessary)" },
    translation: { type: Type.STRING, description: "Translation of the text into the user's language" },
    words: {
      type: Type.ARRAY,
      items: wordSchema
    }
  }
};

// Helper to sanitize words and prevent app crashes
const sanitizeWords = (words: any[]): WordAnalysis[] => {
  if (!Array.isArray(words)) return [];
  return words.map((w: any) => ({
    word: w.word || '',
    original: w.original || w.word || '',
    pronunciation: w.pronunciation || '',
    hanja: w.hanja || null,
    pos: w.pos || 'Unknown',
    level: Object.values(TopikLevel).includes(w.level) ? w.level : TopikLevel.UNDEFINED,
    meaning: w.meaning || '',
    example: w.example || '',
    exampleTranslation: w.exampleTranslation || '',
    usageNote: w.usageNote || ''
  }));
};

/**
 * Analyzes text or file content with optional style constraints.
 */
export const analyzeContentWithGemini = async (
  input: string | { mimeType: string; data: string },
  targetLang: string,
  options?: { politeness?: string; dialect?: string }
): Promise<AnalyzedSentence> => {
  if (!apiKey) throw new Error("API Key is missing");

  const politenessInstruction = options?.politeness 
    ? `Politeness Level: ${options.politeness}` 
    : 'Politeness Level: Natural/Context-appropriate';
    
  const dialectInstruction = options?.dialect 
    ? `Dialect/Region: ${options.dialect}` 
    : 'Dialect: Standard Korean (Seoul)';

  const promptText = `
    You are a professional Korean language educator specialized in TOPIK preparation.
    
    TASK:
    1. Input content processing:
       - If the input is NOT Korean, translate it into Korean.
       - If the input IS Korean, rewrite/adjust it if necessary to match the requested style constraints below.
       
       Target Style Constraints:
       - ${politenessInstruction}
       - ${dialectInstruction}
       
       *Important*: If a specific dialect (like Busan or Jeju) is requested, strictly use the characteristic vocabulary, intonation markers, and sentence endings of that dialect in the 'koreanText' output.
    
    2. Output the final Korean text.
    3. Analyze the Korean text deeply. Break it down into significant words/phrases.
    4. For each word, provide:
       - Hanja (if exists)
       - Pronunciation
       - Part of Speech
       - TOPIK Level (Beginner=TOPIK I, Intermediate=TOPIK II Level 3-4, Advanced=TOPIK II Level 5-6)
       - Meaning (in ${targetLang})
       - Original form (lemma)
       - Usage Note (explain conjugation or grammar strictly in ${targetLang})
       - Example sentence (Korean)
       - Example sentence translation (in ${targetLang})
    
    Ensure the analysis is accurate for students aiming for TOPIK exams.
  `;

  let parts: (string | Part)[] = [];
  
  if (typeof input === 'string') {
    parts = [promptText, `Input Text: """${input}"""`];
  } else {
    // File input
    parts = [
      promptText,
      {
        inlineData: {
          mimeType: input.mimeType,
          data: input.data
        }
      }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a rigorous Korean language analyzer.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const parseData = JSON.parse(text);
    return { 
      koreanText: parseData.koreanText || "",
      translation: parseData.translation || "",
      words: sanitizeWords(parseData.words) 
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

const articleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    koreanText: { type: Type.STRING, description: "The full generated article text in Korean" },
    translation: { type: Type.STRING, description: "Translation in target language" },
    words: {
      type: Type.ARRAY,
      items: wordSchema,
      description: "Detailed analysis of words used in the article for interactive highlighting"
    }
  }
};

export const generateArticleWithGemini = async (topic: string | { mimeType: string; data: string }, targetLang: string): Promise<AnalyzedSentence> => {
  const isFile = typeof topic !== 'string';
  
  const prompt = `
    Act as a Korean writing tutor.
    ${isFile ? "Based on the attached file content," : `Based on the topic '${topic}',`} 
    generate a coherent, logical, and educational Korean article (approx 200-300 words).
    
    The article must:
    1. Be suitable for studying.
    2. Contain a mix of TOPIK I (Beginner) and TOPIK II (Intermediate/Advanced) vocabulary.
    3. Be natural and logically flowed.
    
    After writing the article:
    1. Provide the full Korean text.
    2. Provide a translation in ${targetLang}.
    3. Analyze the words in the text so I can highlight them by level (Beginner vs Intermediate vs Advanced). 
       IMPORTANT: Include an example sentence and its ${targetLang} translation for every analyzed word.
  `;

  const contents: (string | Part)[] = isFile 
    ? [prompt, { inlineData: { mimeType: (topic as any).mimeType, data: (topic as any).data } }]
    : [prompt];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: articleSchema
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    koreanText: data.koreanText || "",
    translation: data.translation || "",
    words: sanitizeWords(data.words)
  };
};

const idolQuoteSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    idolName: { type: Type.STRING },
    koreanQuote: { type: Type.STRING, description: "The Korean sentence/quote" },
    translation: { type: Type.STRING, description: "Translation" },
    context: { type: Type.STRING, description: "Context of the quote or why they might say it" },
    keywords: {
      type: Type.ARRAY,
      items: wordSchema
    }
  }
};

export const getIdolQuote = async (userInput: string, idolName: string, targetLang: string): Promise<IdolQuote> => {
  const prompt = `
    User Keyword/Sentence: "${userInput}"
    Idol Name: "${idolName}"
    Target Language: ${targetLang}

    Task:
    1. Identify the core sentiment or keywords in the User Input.
    2. Retrieve a real quote OR generate a highly characteristic quote spoken by "${idolName}" that relates to the user's input. 
       - If the user input is a question, answer it in the idol's style.
       - If it's a keyword (e.g., "effort", "love"), find a quote about that topic.
    3. The output quote MUST be in Korean.
    4. Provide a translation of the quote in ${targetLang}.
    5. Analyze the key vocabulary in that quote.
    6. Explain the context briefly in ${targetLang} (The language specified in Target Language).
    7. For vocabulary words, ensure usage notes are in ${targetLang}.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', 
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: idolQuoteSchema,
      temperature: 0.8
    }
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    keywords: sanitizeWords(result.keywords)
  };
};

export const searchVocab = async (query: string, targetLang: string): Promise<WordAnalysis[]> => {
   const prompt = `
     Task: Dictionary Search / Thesaurus
     Query: "${query}"
     Target Language for definitions: ${targetLang}

     1. Identify the Korean word(s) matching or related to the query.
     2. If the query is English/Chinese/etc, find the Korean equivalent.
     3. If the query is Korean, find the definition and 2-3 related words/synonyms.
     4. Return a list of 4-6 high-quality words suitable for TOPIK study.
     
     For each word, ensure all fields (original form, pronunciation, level, example, example translation) are filled.
     USAGE NOTES MUST BE IN ${targetLang}.
   `;
   
   const schema: Schema = {
     type: Type.ARRAY,
     items: wordSchema
   };

   try {
     const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: prompt,
       config: {
         responseMimeType: "application/json",
         responseSchema: schema
       }
     });

     const data = JSON.parse(response.text || "[]");
     return sanitizeWords(data);
   } catch (error) {
     console.error("Vocab search error", error);
     return [];
   }
}
