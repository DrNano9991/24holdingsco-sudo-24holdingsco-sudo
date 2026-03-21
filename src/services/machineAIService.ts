import { GoogleGenAI } from "@google/genai";
import { MachineData, Type } from "../types";

export class MachineAIService {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  async interpret(data: MachineData): Promise<string> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return "Interpretation unavailable in offline mode.";
    }

    try {
      const isImage = data.type === 'X-ray' || data.type === 'ECG';
      const prompt = this.getPromptForType(data.type, data.rawContent);

      let contents: any;
      if (isImage && data.mimeType) {
        contents = {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: data.mimeType,
                data: data.rawContent.split(',')[1] || data.rawContent,
              },
            },
          ],
        };
      } else {
        contents = prompt;
      }

      const response = await this.ai.models.generateContent({
        model: isImage ? "gemini-3-flash-preview" : "gemini-3.1-pro-preview",
        contents,
        config: {
          systemInstruction: `You are a specialized medical diagnostic AI. 
          Interpret the provided laboratory or diagnostic machine data accurately and concisely.
          DO NOT use any markdown characters (no asterisks, no hashes, no underscores, no markdown tables).
          Use a well-formatted outline with proper paragraphing.
          Return the response as plain text only.
          CRITICAL: ABSOLUTELY NO MARKDOWN CHARACTERS.`,
        }
      });

      return response.text || "No interpretation generated.";
    } catch (error) {
      console.error("Machine AI Interpretation Error:", error);
      return "Error generating interpretation.";
    }
  }

  private getPromptForType(type: MachineData['type'], content: string): string {
    const basePrompt = `Interpret this ${type} data: ${content}. 
    Provide a well-formatted outline with proper paragraphing. 
    DO NOT use any markdown characters.`;

    switch (type) {
      case 'CBC':
        return `${basePrompt} Identify any abnormalities (anemia, infection, thrombocytopenia) and provide clinical significance.`;
      case 'GeneXpert':
        return `${basePrompt} Focus on TB detection, Rifampicin resistance, HIV Viral Load, COVID-19, or HPV status as applicable.`;
      case 'Truenat':
        return `${basePrompt} Identify the pathogen detected and any resistance markers.`;
      case 'X-ray':
        return `Analyze this Digital X-ray image. Look for signs of TB (infiltrates, cavities, effusions), pneumonia, or other abnormalities. 
        Provide a well-formatted outline with proper paragraphing. DO NOT use any markdown characters.`;
      case 'Glucometer':
        return `${basePrompt} Classify as normal, pre-diabetic, or diabetic (hypoglycemia/hyperglycemia) and suggest immediate actions.`;
      case 'PulseOx':
        return `${basePrompt} Assess for hypoxia and clinical urgency.`;
      case 'ECG':
        return `Analyze this ECG. Identify rhythm, rate, axis, and any signs of ischemia, infarction, or hypertrophy. 
        Provide a well-formatted outline with proper paragraphing. DO NOT use any markdown characters.`;
      default:
        return `${basePrompt}`;
    }
  }
}

export const machineAIService = new MachineAIService();
