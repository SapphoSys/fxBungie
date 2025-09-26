export interface OpenGraphResponse {
  'site_name': string;
  'locale': string;
  'url': string;
  'type': string;
  'image:width': string;
  'image:height': string;
  'title': string;
  'description': string;
  'image': string;
  'date': string;
  'html': string;
  'provider_name'?: string;
  'provider_url'?: string;
  'theme_color'?: string;
}

export interface MetaTagsResponse {
  title: string;
  openGraph: OpenGraphResponse;
  twitter: {
    'card': string;
    'site': string;
    'title': string;
    'description': string;
    'image': string;
    'image:alt': string;
  };
  description: string;
}

export interface OEmbedResponse {
  type: 'rich' | 'photo' | 'video' | 'link';
  version: string;
  title: string;
  author_name?: string;
  author_url?: string;
  provider_name: string;
  provider_url: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  description?: string;
  timestamp?: string;
}
