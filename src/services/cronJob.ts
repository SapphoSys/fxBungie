import { ArticleCache } from '$services/articleCache';
import type { ContentstackResponse, CronJobService, Env } from '$types/cache';

export class CronJob implements CronJobService {
  private articleCache = new ArticleCache();

  async cacheArticles(env: Env): Promise<void> {
    try {
      // Fetch recent articles (last 50 articles should cover most use cases)
      const articles = await this.fetchArticlesFromContentStack(env, 50);

      let _cached = 0;
      let _errors = 0;

      for (const article of articles) {
        try {
          await this.articleCache.cacheArticle(env, article);

          // Cache images to R2
          await this.cacheArticleImages(env, article);

          _cached++;
        } catch (error) {
          console.error(`Failed to cache article ${article.uid}:`, error);
          _errors++;
        }
      }

      // Cleanup expired cache
      await this.cleanupExpiredCache(env);
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  }

  private async fetchArticlesFromContentStack(
    env: Env,
    limit: number = 50
  ): Promise<ContentstackResponse['entries']> {
    const url = new URL('https://cdn.contentstack.io/v3/content_types/news_article/entries/');
    url.searchParams.append('environment', 'live');
    url.searchParams.append('locale', 'en-us');
    url.searchParams.append('desc', 'date');
    url.searchParams.append('include_count', 'true');
    url.searchParams.append('limit', limit.toString());

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

    const response = await fetch(url, {
      headers: {
        'api_key': env.API_KEY,
        'access_token': env.ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'x-user-agent': 'contentstack-web/3.15.0',
      },
    });

    if (!response.ok) {
      throw new Error(`ContentStack API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as ContentstackResponse;
    return data.entries || [];
  }

  private async cacheArticleImages(
    env: Env,
    article: ContentstackResponse['entries'][0]
  ): Promise<void> {
    const imageTypes = ['banner_image', 'image', 'mobile_image'] as const;

    for (const imageType of imageTypes) {
      const imageData = article[imageType];
      if (imageData?.url) {
        try {
          await this.cacheImage(env, imageData.url, article.uid, imageType);
        } catch (error) {
          console.error(`Failed to cache ${imageType} for article ${article.uid}:`, error);
          // Continue with other images
        }
      }
    }
  }

  async cacheImage(
    env: Env,
    imageUrl: string,
    articleUid: string,
    imageType: string
  ): Promise<string> {
    const r2Path = this.generateR2Path(articleUid, imageType, imageUrl);

    try {
      // Check if image already exists in R2
      const existingImage = await env.R2.head(r2Path);
      if (existingImage) {
        return r2Path; // Already cached
      }

      // Fetch image from ContentStack
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      // Store in R2
      await env.R2.put(r2Path, imageData, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000', // 1 year
        },
      });

      return r2Path;
    } catch (error) {
      console.error(`Failed to cache image ${imageUrl}:`, error);
      throw error;
    }
  }

  private generateR2Path(articleUid: string, imageType: string, originalUrl: string): string {
    const urlObj = new URL(originalUrl);
    const filename = urlObj.pathname.split('/').pop() || 'image';
    return `images/${articleUid}/${imageType}/${filename}`;
  }

  async cleanupExpiredCache(env: Env): Promise<void> {
    await this.articleCache.cleanupExpiredCache(env);
  }
}
