import axios from 'axios';
import { translate } from '@vitalets/google-translate-api';
import { loadVietnameseProfanity } from "../utils/profanity/profanity-vi";

const API_KEY = process.env.GOOGLE_API_KEY;
const DISCOVERY_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

const VIET_PROFANITY = loadVietnameseProfanity();

function containsVietnameseProfanity(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); 

  return VIET_PROFANITY.some(word => {
    const normalizedWord = word
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    return regex.test(normalized);
  });
}

interface PerspectiveResult {
  isToxic: boolean;
  score: number;
}

export const checkToxicity = async (text: string): Promise<PerspectiveResult> => {
  if (!text) return { isToxic: false, score: 0 };
  
  try {
    if (containsVietnameseProfanity(text)) {
      console.log("Phát hiện từ tục tiếng Việt");
      return { isToxic: true, score: 1 };
    }

    let textToCheck = text;
    try {
        const translation = await translate(text, { to: 'en' });
        textToCheck = translation.text;
        console.log(`Dịch: "${text}" -> "${textToCheck}"`); 
    } catch (transError) {
        console.warn("Lỗi dịch thuật", transError);
    }
    const response = await axios.post(`${DISCOVERY_URL}?key=${API_KEY}`, {
      comment: { text: textToCheck },
      languages: ['en'], 
      requestedAttributes: {
        TOXICITY: {}, 
      },
    });

    const toxicityScore = response.data.attributeScores.TOXICITY.summaryScore.value;
    const THRESHOLD = 0.7;

    return {
      isToxic: toxicityScore > THRESHOLD,
      score: toxicityScore,
    };

  } catch (error: any) {
    console.error('Perspective API Error:', error.response?.data || error.message);
    return { isToxic: false, score: 0 };
  }
};
