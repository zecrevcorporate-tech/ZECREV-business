export interface Business {
  title: string;
  uri: string;
  placeId: string;
  latitude?: number;
  longitude?: number;
}

export interface BusinessDetails {
  address?: string;
  phone?: string;
  hours?: string[];
  website?: string;
}

export interface GroundingChunk {
  maps: {
    uri: string;
    title: string;
    placeId: string;
  };
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}