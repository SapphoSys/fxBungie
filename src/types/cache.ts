import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface ContentstackImage {
  uid: string;
  url: string;
  title?: string;
  file_size?: string;
  content_type?: string;
}

export interface ContentstackArticle {
  uid: string;
  title: string;
  subtitle: string;
  author: string;
  banner_image?: ContentstackImage;
  image?: ContentstackImage;
  mobile_image?: ContentstackImage;
  html_content?: string;
  date: string;
  url: {
    hosted_url: string;
  };
  _version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContentstackResponse {
  entries: ContentstackArticle[];
  count?: number;
}

export interface CachedArticle {
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

export interface CachedImage {
  id: number;
  article_uid: string;
  image_type: string;
  original_url: string;
  r2_path: string;
  cached_at: string;
  file_size: number | null;
  content_type: string | null;
}

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  API_KEY: string;
  ACCESS_TOKEN: string;
  ASSETS: any;
}

export interface CronJobService {
  cacheArticles(env: Env): Promise<void>;
  cacheImage(env: Env, imageUrl: string, articleUid: string, imageType: string): Promise<string>;
  cleanupExpiredCache(env: Env): Promise<void>;
}

export interface ArticleCacheService {
  getArticleFromCache(env: Env, hostedUrl: string): Promise<CachedArticle | null>;
  getCachedImages(env: Env, articleUid: string): Promise<CachedImage[]>;
  cacheArticle(env: Env, article: ContentstackArticle): Promise<void>;
  isArticleCacheValid(article: CachedArticle): boolean;
}
