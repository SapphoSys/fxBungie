export const prerender = false;

import type { APIRoute } from 'astro';

interface ContentstackImage {
  url: string;
  title?: string;
}

export interface ContentstackArticle {
  uid: string;
  title: string;
  subtitle: string;
  author: string;
  banner_image: ContentstackImage;
  image: ContentstackImage;
  html_content: string;
  date: string;
  url: {
    hosted_url: string;
  };
}

interface ContentstackResponse {
  entries: ContentstackArticle[];
}

interface CachedArticle {
  id: string;
  uid: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  html_content: string | null;
  date: string;
  hosted_url: string;
  created_at: string;
  updated_at: string;
  cache_expiry: string;
  contentstack_data: string;
}

// Simple cache service without external dependencies
class SimpleArticleCache {
  // eslint-disable-next-line no-undef
  async getArticleFromCache(env: Cloudflare.Env, hostedUrl: string): Promise<CachedArticle | null> {
    try {
      const result = await env.DB.prepare('SELECT * FROM articles WHERE hosted_url = ? LIMIT 1')
        .bind(hostedUrl)
        .first<CachedArticle>();

      return result || null;
    } catch (error) {
      console.error('Error fetching article from cache:', error);
      return null;
    }
  }

  // eslint-disable-next-line no-undef
  async cacheArticle(env: Cloudflare.Env, article: ContentstackArticle): Promise<void> {
    const now = new Date().toISOString();
    // Cache TWID articles for 1 hour, others for 1 day
    const cacheHours = article.url.hosted_url.startsWith('/twid_') ? 1 : 24;
    const cacheExpiry = new Date(Date.now() + cacheHours * 60 * 60 * 1000).toISOString();

    try {
      await env.DB.prepare(
        `
        INSERT OR REPLACE INTO articles (
          id, uid, title, subtitle, author, html_content, date,
          hosted_url, created_at, updated_at, cache_expiry, contentstack_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          article.url.hosted_url,
          article.uid,
          article.title,
          article.subtitle || null,
          article.author || null,
          article.html_content || null,
          article.date,
          article.url.hosted_url,
          now,
          now,
          cacheExpiry,
          JSON.stringify(article)
        )
        .run();
    } catch (error) {
      console.error('Error caching article:', error);
    }
  }

  isArticleCacheValid(article: CachedArticle): boolean {
    const expiryTime = new Date(article.cache_expiry).getTime();
    return Date.now() < expiryTime;
  }
}

const openGraphAuthors = {
  'Destiny': {
    link: 'https://www.bungie.net/7/en/News/Destiny',
    color: '#00a3e3',
  },
  'Marathon': {
    link: 'https://www.bungie.net/7/en/News/Marathon',
    color: '#c2fe0c',
  },
  'Bungie Foundation': {
    link: 'https://bungiefoundation.org/',
    color: '#ee372c',
  },
  default: {
    link: 'https://www.bungie.net/7/en/News',
    color: '#00a3e3',
  },
};

const getAuthorByKeyword = (keyword: string) => {
  const lowerKeyword = keyword.toLowerCase();

  for (const [key, value] of Object.entries(openGraphAuthors)) {
    if (lowerKeyword.includes(key.toLowerCase())) {
      return value;
    }
  }

  return openGraphAuthors.default;
};

const fetchFromContentStack = async (
  id: string,
  // eslint-disable-next-line no-undef
  env: Cloudflare.Env
): Promise<ContentstackArticle> => {
  const url = new URL('https://cdn.contentstack.io/v3/content_types/news_article/entries/');
  url.searchParams.append('environment', 'live');
  url.searchParams.append('locale', 'en-us');
  url.searchParams.append(
    'query',
    JSON.stringify({
      'url.hosted_url': `/${id}`,
    })
  );

  const response = await fetch(url, {
    headers: {
      api_key: env.API_KEY,
      access_token: env.ACCESS_TOKEN,
      'Content-Type': 'application/json',
      'x-user-agent': 'contentstack-web/3.15.0',
    },
  });

  if (!response.ok) {
    console.error('[Backend] API request failed:', {
      status: response.status,
      statusText: response.statusText,
    });

    try {
      const errorBody = await response.text();
      console.error('[Backend] API error response:', errorBody);
    } catch (bodyErr) {
      if (bodyErr instanceof Error) {
        console.error('[Backend] Failed to read error response body:', {
          message: bodyErr.message,
          stack: bodyErr.stack,
          url,
          id,
        });
      } else {
        console.error('[Backend] Failed to read error response body:', bodyErr);
      }
    }

    throw new Error(`API returned ${response.status}`);
  }

  const data = (await response.json()) as ContentstackResponse;

  if (!data.entries[0]) {
    console.warn(`No article found with id: ${id}`);
    throw new Error('Article not found');
  }

  return data.entries[0];
};

const buildMetaTagsFromCachedArticle = (cachedArticle: CachedArticle, id: string) => {
  const article = JSON.parse(cachedArticle.contentstack_data) as ContentstackArticle;
  return buildMetaTags(article, id);
};

const buildMetaTags = (article: ContentstackArticle, id: string) => {
  const authorInfo = article.author ? getAuthorByKeyword(article.author) : openGraphAuthors.default;

  const imageUrl =
    article.banner_image?.url ||
    article.image?.url ||
    'https://www.bungie.net/img/theme/bungienet/logo-share-large.png?on-purpose=true';

  return {
    title: article.title,
    openGraph: {
      'site_name': 'Bungie.net',
      'locale': 'en-US',
      'url': `https://www.bungie.net/7/en/News/Article/${id}`,
      'type': 'article',
      'image:width': '1200',
      'image:height': '630',
      'title': article.title,
      'date': article.date,
      'description': article.subtitle,
      'image': imageUrl,
      'html': article.html_content || '',
      'provider_name': article.author,
      'provider_url': authorInfo.link,
      'theme_color': authorInfo.color,
    },
    twitter: {
      'card': 'summary_large_image',
      'site': '@Bungie',
      'title': article.title,
      'description': article.subtitle,
      'image': imageUrl,
      'image:alt': article.title,
    },
    description: article.subtitle,
  };
};

export const GET: APIRoute = async (context) => {
  const id = context.url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const env = context.locals.runtime.env;
  const articleCache = new SimpleArticleCache();

  try {
    // Try to get from cache first
    const cachedArticle = await articleCache.getArticleFromCache(env, `/${id}`);

    if (cachedArticle && articleCache.isArticleCacheValid(cachedArticle)) {
      const metaTags = buildMetaTagsFromCachedArticle(cachedArticle, id);

      // Calculate cache duration (1 hour for TWID articles, 1 day for others)
      const maxAge = id.startsWith('twid_') ? 3600 : 86400;

      return new Response(JSON.stringify(metaTags), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `public, max-age=${maxAge}`,
          'Expires': new Date(Date.now() + maxAge * 1000).toUTCString(),
          'X-Cache': 'HIT',
        },
      });
    }

    // Fallback to ContentStack API
    console.warn(`Cache miss for article: ${id}, fetching from ContentStack`);

    const article = await fetchFromContentStack(id, env);
    const metaTags = buildMetaTags(article, id);

    // Cache the article for future requests (fire and forget)
    try {
      await articleCache.cacheArticle(env, article);
    } catch (cacheError) {
      console.error('Failed to cache article after API fetch:', cacheError);
      // Don't fail the request if caching fails
    }

    // Calculate cache duration (1 hour for TWID articles, 1 day for others)
    const maxAge = id.startsWith('twid_') ? 3600 : 86400;

    return new Response(JSON.stringify(metaTags), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=${maxAge}`,
        'Expires': new Date(Date.now() + maxAge * 1000).toUTCString(),
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Backend] Error fetching article metadata:', error);

    return new Response(
      JSON.stringify({
        error: '[Backend] Failed to fetch article metadata',
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
