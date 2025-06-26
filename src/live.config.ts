import { defineLiveCollection } from 'astro:content';
import { ACCESS_TOKEN, API_KEY } from 'astro:env/server';

import type { ContentstackResponse } from '$types/cache';

interface ContentstackImage {
  url: string;
  title?: string;
}

interface ContentstackArticle {
  uid: string;
  title: string;
  subtitle: string;
  author: string;
  banner_image?: ContentstackImage | null;
  image?: ContentstackImage | null;
  mobile_image?: ContentstackImage | null;
  html_content?: string | null;
  date: string;
  url: {
    hosted_url: string;
  };
  _version?: number;
  created_at?: string;
  updated_at?: string;
}

interface Store {
  clear(): void;
}

interface LoaderFilter {
  id?: string;
  slug?: string;
}

const contentStackLoader = (config: { apiKey: string; accessToken: string }) => {
  return {
    name: 'contentstack-articles',
    async loadCollection({ store }: { store: Store }) {
      try {
        console.warn('Loading ContentStack articles collection...');
        const url = new URL('https://cdn.contentstack.io/v3/content_types/news_article/entries/');
        url.searchParams.append('environment', 'live');
        url.searchParams.append('locale', 'en-us');
        url.searchParams.append('desc', 'date');
        url.searchParams.append('include_count', 'true');

        // Include all necessary fields
        const fields = [
          'uid',
          'title',
          'subtitle',
          'author',
          'date',
          'url',
          'html_content',
          'image',
          'mobile_image',
          'banner_image',
          '_version',
          'created_at',
          'updated_at',
        ];

        fields.forEach((field) => {
          url.searchParams.append('only[BASE][]', field);
        });

        console.warn('Fetching from ContentStack API:', url.toString());
        const response = await fetch(url, {
          headers: {
            'api_key': config.apiKey,
            'access_token': config.accessToken,
            'Content-Type': 'application/json',
            'x-user-agent': 'contentstack-web/3.15.0',
          },
        });

        if (!response.ok) {
          throw new Error(`ContentStack API returned ${response.status}`);
        }

        const data = (await response.json()) as ContentstackResponse;
        console.warn(`Received ${data.entries.length} articles from ContentStack`);
        store.clear();

        const entries = data.entries.map((entry) => ({
          id: entry.url.hosted_url,
          data: entry as ContentstackArticle,
        }));

        return { entries };
      } catch (error) {
        console.error('Failed to load ContentStack articles:', error);
        return {
          error: new Error(`Failed to load ContentStack articles: ${error}`),
        };
      }
    },

    async loadEntry({ filter }: { filter: LoaderFilter }) {
      try {
        if (!config.apiKey || !config.accessToken) {
          console.error('ContentStack API key or access token is not configured');
          return {
            error: new Error('ContentStack API key or access token is not configured'),
          };
        }
        console.warn('Loading single ContentStack article...', filter);
        const url = new URL('https://cdn.contentstack.io/v3/content_types/news_article/entries/');
        url.searchParams.append('environment', 'live');
        url.searchParams.append('locale', 'en-us');

        if (filter?.id) {
          url.searchParams.append(
            'query',
            JSON.stringify({
              'url.hosted_url': `/${filter.id}`,
            })
          );
        } else if (filter?.slug) {
          url.searchParams.append(
            'query',
            JSON.stringify({
              'url.hosted_url': `/${filter.slug}`,
            })
          );
        } else {
          return {
            error: new Error('No id or slug provided'),
          };
        }

        console.warn('Fetching from ContentStack API:', url.toString());
        const response = await fetch(url, {
          headers: {
            'api_key': config.apiKey,
            'access_token': config.accessToken,
            'Content-Type': 'application/json',
            'x-user-agent': 'contentstack-web/3.15.0',
          },
        });

        if (!response.ok) {
          throw new Error(`ContentStack API returned ${response.status}`);
        }

        const data = (await response.json()) as ContentstackResponse;
        const entry = data.entries[0];

        if (!entry) {
          console.warn('No article found for filter:', filter);
          return {
            error: new Error('Article not found'),
          };
        }

        return {
          id: entry.url.hosted_url,
          data: entry as ContentstackArticle,
          rendered: {
            html: entry.html_content || '',
          },
        };
      } catch (error) {
        console.error('Failed to load ContentStack article:', error);
        return {
          error: new Error(`Failed to load ContentStack article: ${error}`),
        };
      }
    },
  };
};

export const collections = {
  'articles': defineLiveCollection({
    type: 'live',
    loader: contentStackLoader({
      apiKey: API_KEY,
      accessToken: ACCESS_TOKEN,
    }),
  }),
};
