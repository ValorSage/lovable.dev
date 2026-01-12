import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a streaming response from the Gemini model.
 * Uses gemini-3-flash-preview for low latency streaming.
 * Supports text and optional image input.
 */
export async function* streamIdeaResponse(prompt: string, imageBase64?: string) {
  try {
    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {
        // Extract mime type and base64 data from Data URL
        const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (match) {
            parts.unshift({
                inlineData: {
                    mimeType: match[1],
                    data: match[2]
                }
            });
        }
    }

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: parts }],
      config: {
        systemInstruction: "You are an AI assistant for a web creation tool called 'Lovable'. Your tone is helpful, creative, and enthusiastic. The user is asking to create an internal tool or app. If an image is provided, analyze it as a wireframe or reference. Provide a structured plan including: 1) Core Features, 2) Data Structure, 3) Color Palette (Hex codes). Use simple formatting.",
      },
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    yield "\n\n(Sorry, I encountered an error while connecting to the AI. Please try again.)";
  }
}

/**
 * Generates 5 short, creative web app ideas.
 */
export async function generateVibeIdeas(): Promise<string[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Generate 5 short, distinct, and creative web app ideas for 2025. They should be specific and trendy (e.g., 'A brutalist portfolio', 'AI fitness tracker').",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return [];
    } catch (error) {
        console.error("Error generating vibes:", error);
        return [
            "A futuristic dashboard with glassmorphism",
            "Minimalist task manager for creatives",
            "Neon-styled crypto portfolio tracker",
            "Retro 90s style personal blog",
            "AI-powered recipe generator app"
        ];
    }
}

/**
 * Streams the actual code for the application based on the approved plan.
 * Uses gemini-3-pro-preview for high-quality code generation.
 */
export async function* streamAppCode(plan: string) {
    try {
        const response = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: `Create a single-file, fully functional, responsive HTML prototype using Tailwind CSS for the following project plan.
            
            PLAN:
            ${plan}
            
            REQUIREMENTS:
            1. Use <script src="https://cdn.tailwindcss.com"></script> for styling.
            2. Use <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"> for icons (FontAwesome).
            3. Use Google Fonts (Inter) to match the modern aesthetic.
            4. **IMAGES**: Use high-quality, relevant placeholder images. Use 'https://images.unsplash.com/photo-...' if you know a specific valid ID, otherwise use 'https://picsum.photos/seed/{keyword}/800/600' where {keyword} is relevant to the section (e.g. 'office', 'tech', 'nature'). Do not use solid color placeholders.
            5. **DESIGN**: Make it look professional, modern, and high-fidelity (glassmorphism, clean typography, rounded corners).
            6. **FUNCTIONALITY (CRITICAL)**: You MUST write valid Vanilla JavaScript to make the app interactive. 
               - All buttons MUST work (e.g., switch tabs, open modals, trigger alerts, add items to lists).
               - Forms MUST handle submit events (prevent default, console log, show success feedback).
               - Navigation links MUST work (smooth scroll or update active view).
               - Do not leave empty 'onclick' handlers. Implement logic.
            7. **OUTPUT**: Return ONLY the raw HTML code (containing <style> and <script> tags). Do not include markdown code blocks (like \`\`\`html). Do not include explanations.
            `,
            config: {
                systemInstruction: "You are an expert Full Stack Engineer. You write clean, semantic HTML5, use Tailwind CSS for rapid styling, and write robust Vanilla JavaScript. You never create static shells; your prototypes always have working buttons, forms, and basic interactivity."
            }
        });

        for await (const chunk of response) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        console.error("Error generating code:", error);
        yield "<!-- Error generating code. Please try again. -->";
    }
}

/**
 * Streams updates to existing code based on user feedback.
 * Uses gemini-3-pro-preview to ensure logic is preserved during edits.
 */
export async function* streamCodeEdit(currentCode: string, prompt: string) {
    try {
        const response = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: `The user wants to update the following HTML code.
            
            CURRENT CODE:
            ${currentCode}
            
            USER REQUEST:
            ${prompt}
            
            REQUIREMENTS:
            1. Return the FULL updated HTML code. 
            2. Do not use markdown blocks.
            3. Maintain existing functionality, FontAwesome icons, and Tailwind styling unless asked to change.
            4. Ensure any NEW buttons or features added are fully functional using Vanilla JS.
            5. If fixing a bug, ensure the JavaScript logic is corrected.
            `,
            config: {
                systemInstruction: "You are an expert Frontend Engineer refining an existing HTML prototype. You implement changes precisely, ensuring all buttons and interactions remain functional. You fix broken scripts immediately."
            }
        });

        for await (const chunk of response) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        console.error("Error editing code:", error);
        yield currentCode; // Return original on failure
    }
}