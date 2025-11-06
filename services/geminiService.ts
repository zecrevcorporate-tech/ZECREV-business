import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Business, LocationCoords, GroundingChunk, BusinessDetails } from '../types';

export const findNearbyBusinesses = async (
  category: string,
  location: LocationCoords | null,
  manualLocation?: string,
): Promise<Business[]> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let contents: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {};
    
    if (location) {
      contents = `Find good ${category} businesses near latitude ${location.latitude} and longitude ${location.longitude}.`;
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          businesses: {
            type: Type.ARRAY,
            description: "A list of nearby businesses.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The name of the business." },
                placeId: { type: Type.STRING, description: "The Google Maps Place ID." },
                latitude: { type: Type.NUMBER, description: "The latitude of the business location." },
                longitude: { type: Type.NUMBER, description: "The longitude of the business location." },
              },
              required: ["title", "placeId", "latitude", "longitude"],
            },
          },
        },
        required: ["businesses"],
      };
    } else if (manualLocation?.trim()) {
      contents = `Find good ${category} businesses in ${manualLocation}.`;
      config.tools = [{ googleMaps: {} }];
    } else {
      throw new Error("A location (either automatic or manual) must be provided.");
    }
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config,
    });
    
    let businesses: Business[] = [];

    if (location) {
      // Handle JSON response for geolocation search
      if (response.text) {
        const parsed = JSON.parse(response.text);
        businesses = (parsed.businesses || []).map((b: any) => ({
            title: b.title,
            placeId: b.placeId,
            latitude: b.latitude,
            longitude: b.longitude,
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.title)}&query_place_id=${b.placeId}`,
        }));
      }
    } else {
      // Handle grounding response for manual location search
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        businesses = (groundingChunks as GroundingChunk[])
            .filter(chunk => chunk.maps && chunk.maps.title && chunk.maps.uri)
            .map(chunk => ({
                title: chunk.maps.title,
                uri: chunk.maps.uri,
                placeId: chunk.maps.placeId,
            }));
      }
    }
      
    // Remove duplicates by placeId
    const uniqueBusinesses = Array.from(new Map(businesses.map(item => [item.placeId, item])).values());
    return uniqueBusinesses;

  } catch (error) {
    console.error("Error fetching data from Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to find businesses: ${error.message}`);
    }
    throw new Error("An unknown error occurred while finding businesses.");
  }
};

export const getBusinessDetails = async (placeId: string): Promise<BusinessDetails> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide details for the business with Google Maps Place ID: ${placeId}. Ensure the address is complete and the phone number includes the country code.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            address: {
              type: Type.STRING,
              description: "The full, formatted street address of the business."
            },
            phone: {
              type: Type.STRING,
              description: "The international phone number for the business."
            },
            hours: {
              type: Type.ARRAY,
              description: "A list of strings, each representing the opening hours for a day of the week.",
              items: { type: Type.STRING }
            },
            website: {
              type: Type.STRING,
              description: "The official website URL of the business."
            }
          },
          required: ["address", "phone", "hours"]
        }
      }
    });

    if (!response.text) {
        throw new Error("Received an empty response from the API.");
    }

    const details = JSON.parse(response.text);
    return details;

  } catch (error) {
    console.error("Error fetching business details from Gemini API:", error);
     if (error instanceof Error) {
        throw new Error(`Failed to get business details: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching business details.");
  }
};

export const generateContactPitch = async (businessName: string, businessCategory: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a short, professional outreach email template to a business.
      Business Name: "${businessName}"
      Business Category: "${businessCategory}"

      The email should be from a potential customer inquiring about their services. Make it friendly, concise, and easy to customize. Provide only the email body text, without any introduction or sign-off formalities like "Subject:" or "Sincerely,".`,
       config: {
        systemInstruction: "You are a helpful assistant that writes professional business communication.",
      }
    });

    if (!response.text) {
      throw new Error("Received an empty response from the API.");
    }

    return response.text;
  } catch (error) {
    console.error("Error generating contact pitch:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate pitch: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the contact pitch.");
  }
};