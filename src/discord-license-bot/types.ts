export type Platform = 'youtube' | 'tiktok' | 'twitter';

export interface VideoMetadata {
  title: string;
  description: string;
}

export interface LicenseAnalysis {
  hasExplicitLicense: boolean;
  licenseType: string;
  canUseCommercially: boolean;
  requiresAttribution: boolean;
  licensingContact: string | null;
  licensingCompany: string | null;
  notes: string;
}

// Define explicit interfaces for API responses
export interface YoutubeApiResponse {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
    };
  }>;
}

export interface TiktokApiResponse {
  title?: string;
  description?: string;
}

export interface TwitterApiResponse {
  data?: {
    text?: string;
  };
}

// Changed from mapped types to regular interfaces
export interface VideoExtractors {
  youtube: (url: string) => string | null;
  tiktok: (url: string) => string | null;
  twitter: (url: string) => string | null;
}

export interface MetadataFetchers {
  youtube: (videoId: string) => Promise<VideoMetadata>;
  tiktok: (videoId: string) => Promise<VideoMetadata>;
  twitter: (videoId: string) => Promise<VideoMetadata>;
}

export interface ProcessedResult extends Partial<LicenseAnalysis>, Partial<VideoMetadata> {
  url: string;
  platform?: Platform;
  videoId?: string;
  error?: string;
}