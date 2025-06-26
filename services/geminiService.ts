
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserInputs, BookStructure, GenerationMode } from '../types'; 
import { 
  GEMINI_FLASH_MODEL_NORMAL,
  GEMINI_PRO_MODEL_ADVANCED,
  STRUCTURE_PROMPT_TEMPLATE,
  TITLE_PROMPT_TEMPLATE,
  CONTENT_PROMPT_TEMPLATE,
  MAX_RETRIES,
  RETRY_DELAY_MS
} from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Application functionality will be impaired or fail.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY }); 

const getModelId = (mode: GenerationMode): string => {
  return mode === 'advanced' ? GEMINI_PRO_MODEL_ADVANCED : GEMINI_FLASH_MODEL_NORMAL;
};

const formatReferenceTexts = (referenceTextsString?: string): string => {
  return referenceTextsString && referenceTextsString.trim() !== "" 
    ? referenceTextsString 
    : "No reference texts provided by the user.";
};

export const parseJsonFromText = (text: string): any => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original text:", text);
    throw new Error("Invalid JSON response from AI. The AI returned content that was not valid JSON.");
  }
};

export const generateBookStructureStream = async (
  inputs: UserInputs, 
  referenceTextsString?: string
): Promise<AsyncIterable<GenerateContentResponse>> => {
  const prompt = STRUCTURE_PROMPT_TEMPLATE
    .replace(/\$\{language\}/g, inputs.language)
    .replace(/\$\{subject\}/g, inputs.subject)
    .replace(/\$\{additionalInfo\}/g, inputs.additionalInfo || "None")
    .replace(/\$\{numberOfChapters\}/g, inputs.numberOfChapters.toString())
    .replace(/\$\{referenceTexts\}/g, formatReferenceTexts(referenceTextsString))
    .replace(/\$\{outlineRegenerationRequest\}/g, inputs.outlineRegenerationPrompt || "None (this is not a regeneration request or no specific changes were requested for regeneration).");


  return ai.models.generateContentStream({
    model: getModelId(inputs.generationMode),
    contents: prompt,
  });
};

export const generateBookTitle = async (
  inputs: UserInputs, 
  bookStructure: BookStructure, 
  referenceTextsString?: string
): Promise<string> => {
  const prompt = TITLE_PROMPT_TEMPLATE
    .replace(/\$\{language\}/g, inputs.language)
    .replace(/\$\{subject\}/g, inputs.subject)
    .replace(/\$\{additionalInfo\}/g, inputs.additionalInfo || "None")
    .replace(/\$\{bookStructure\}/g, JSON.stringify(bookStructure, null, 2))
    .replace(/\$\{referenceTexts\}/g, formatReferenceTexts(referenceTextsString))
    .replace(/\$\{outlineRegenerationRequest\}/g, inputs.outlineRegenerationPrompt || "None (this is not a regeneration request or no specific changes were requested for regeneration).");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: getModelId(inputs.generationMode),
        contents: prompt,
      });
      const text = response.text?.trim();
      if (text) {
        return text;
      }
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to generate book title after ${MAX_RETRIES} attempts (empty response).`);
      }
      console.warn(`Attempt ${attempt} for book title generation failed (empty response). Retrying in ${RETRY_DELAY_MS}ms...`);
    } catch (error) {
      console.error(`Attempt ${attempt} for book title generation failed:`, error);
      if (attempt === MAX_RETRIES) {
        throw error; 
      }
    }
    if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  // This line should ideally not be reached if MAX_RETRIES >= 1
  throw new Error("Failed to generate book title due to an unexpected issue in retry logic.");
};


export const generateChapterContentStream = async (
  inputs: UserInputs,
  chapterTitle: string,
  chapterOutlineJson: string, 
  fullBookStructureJson: string, 
  previouslyGeneratedChaptersContent: string,
  referenceTextsString?: string,
  rewriteInstructions?: string
): Promise<AsyncIterable<GenerateContentResponse>> => {
  const prompt = CONTENT_PROMPT_TEMPLATE
    .replace(/\$\{language\}/g, inputs.language)
    .replace(/\$\{overallBookSubject\}/g, inputs.subject)
    .replace(/\$\{additionalInfo\}/g, inputs.additionalInfo || "None")
    .replace(/\$\{chapterTitle\}/g, chapterTitle)
    .replace(/\$\{chapterOutlineJson\}/g, chapterOutlineJson)
    .replace(/\$\{fullBookStructureJson\}/g, fullBookStructureJson)
    .replace(/\$\{previouslyGeneratedChaptersContent\}/g, previouslyGeneratedChaptersContent || "No chapters written yet.")
    .replace(/\$\{contentLength\}/g, inputs.contentLength.toString())
    .replace(/\$\{readingLevel\}/g, inputs.readingLevel.toString())
    .replace(/\$\{referenceTexts\}/g, formatReferenceTexts(referenceTextsString))
    .replace(/\$\{rewriteInstructions\}/g, rewriteInstructions || "None (this is not a rewrite request or no specific instructions were provided for this chapter).");
    
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = await ai.models.generateContentStream({
        model: getModelId(inputs.generationMode),
        contents: prompt,
      });
      // Check if stream is valid (e.g., by trying to get an iterator or first chunk)
      // This is a basic check; more robust checks might be needed depending on SDK behavior
      // For now, we assume if generateContentStream doesn't throw, the stream object is valid to iterate.
      return stream; 
    } catch (error) {
      console.error(`Attempt ${attempt} to initiate chapter content stream for "${chapterTitle}" failed:`, error);
      if (attempt === MAX_RETRIES) {
        throw error; 
      }
      console.warn(`Retrying stream initiation for "${chapterTitle}" in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  // This line should ideally not be reached if MAX_RETRIES >= 1
  throw new Error(`Failed to generate chapter content stream for "${chapterTitle}" after ${MAX_RETRIES} attempts.`);
};
