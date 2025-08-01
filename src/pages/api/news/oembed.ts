import type { APIRoute } from 'astro';

interface MetaTagsResponse {
  title: string;
  openGraph: {
    'site_name': string;
    'locale': string;
    'url': string;
    'type': string;
    'image:width': string;
    'image:height': string;
    'title': string;
    'description': string;
    'image': string;
    'provider_name'?: string;
    'provider_url'?: string;
    'theme_color'?: string;
  };
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

interface OEmbedResponse {
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

export const GET: APIRoute = async (context) => {
  const url = context.url.searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const articleId = url.split('/News/Article/')[1];
    const apiUrl = new URL(`${context.url.origin}/api/news/opengraph?id=${articleId}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch article metadata');
    }

    const data = (await response.json()) as MetaTagsResponse;

    const oembedResponse: OEmbedResponse = {
      type: 'rich',
      version: '1.0',
      title: data.title,
      provider_name: data.openGraph?.provider_name || 'Bungie.net',
      provider_url: data.openGraph?.provider_url || 'https://www.bungie.net',
    };

    if (data.openGraph?.image) {
      oembedResponse.thumbnail_url = data.openGraph.image;
      oembedResponse.thumbnail_width = 1200;
      oembedResponse.thumbnail_height = 630;
    }

    return new Response(JSON.stringify(oembedResponse), {
      headers: {
        'Content-Type': 'application/json+oembed',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Backend] Error generating oEmbed response:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate oEmbed response',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
