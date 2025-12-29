import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async analyzePerformance(dataContext: string): Promise<string> {
    try {
      const model = 'gemini-2.5-flash';
      const prompt = `
        You are an expert Digital Marketing Analyst specializing in Facebook Ads for digital products.
        The currency used is INR (Indian Rupee), and all cost/price values are in INR.
        Analyze the following sales and ad performance data:
        ${dataContext}

        Please provide:
        1. A brief executive summary of profitability, considering ad spend.
        2. Identify which products have a CPA (Cost Per Acquisition) that is higher than their Price. A CPA higher than the price means you're losing money on each sale from ad spend alone.
        3. Actionable advice on how to lower CPC or improve ROAS for the underperforming products.
        4. Keep the tone professional, encouraging, and concise. Format with clear bullet points.
      `;

      const response = await this.ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      return response.text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'Unable to generate analysis at this time. Please check your API key or try again later.';
    }
  }
}