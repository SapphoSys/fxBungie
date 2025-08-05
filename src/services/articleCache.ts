import type { ArticleCacheService, CachedArticle, CachedImage, Env } from '$types/cache';
import type { ContentstackArticle } from '$types/contentStack';

export class ArticleCache implements ArticleCacheService {
  async getArticleFromCache(env: Env, hostedUrl: string): Promise<CachedArticle | null> {
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

  async getCachedImages(env: Env, articleUid: string): Promise<CachedImage[]> {
    try {
      const result = await env.DB.prepare('SELECT * FROM images WHERE article_uid = ?')
        .bind(articleUid)
        .all<CachedImage>();

      return result.results || [];
    } catch (error) {
      console.error('Error fetching cached images:', error);
      return [];
    }
  }

  async cacheArticle(env: Env, article: ContentstackArticle): Promise<void> {
    const now = new Date().toISOString();
    // Cache TWID articles for 1 hour, others for 1 day
    const cacheHours = article.url.hosted_url.startsWith('/twid_') ? 1 : 24;
    const cacheExpiry = new Date(Date.now() + cacheHours * 60 * 60 * 1000).toISOString();

    try {
      // Insert or update article
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

      // Cache images if they exist
      const imageTypes = ['banner_image', 'image', 'mobile_image'] as const;

      for (const imageType of imageTypes) {
        const imageData = article[imageType];
        if (imageData?.url) {
          try {
            await this.cacheImageMetadata(env, article.uid, imageType, imageData);
          } catch (imageError) {
            console.error(`Failed to cache ${imageType} for article ${article.uid}:`, imageError);
            // Continue with other images even if one fails
          }
        }
      }
    } catch (error) {
      console.error('Error caching article:', error);
      throw error;
    }
  }

  private async cacheImageMetadata(
    env: Env,
    articleUid: string,
    imageType: string,
    imageData: { url: string; file_size?: string; content_type?: string }
  ): Promise<void> {
    const r2Path = this.generateR2Path(articleUid, imageType, imageData.url);

    await env.DB.prepare(
      `
      INSERT OR REPLACE INTO images (
        article_uid, image_type, original_url, r2_path,
        cached_at, file_size, content_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        articleUid,
        imageType,
        imageData.url,
        r2Path,
        new Date().toISOString(),
        imageData.file_size ? parseInt(imageData.file_size) : null,
        imageData.content_type || null
      )
      .run();
  }

  private generateR2Path(articleUid: string, imageType: string, originalUrl: string): string {
    const urlObj = new URL(originalUrl);
    const filename = urlObj.pathname.split('/').pop() || 'image';
    return `images/${articleUid}/${imageType}/${filename}`;
  }

  isArticleCacheValid(article: CachedArticle): boolean {
    const expiryTime = new Date(article.cache_expiry).getTime();
    return Date.now() < expiryTime;
  }

  async cleanupExpiredCache(env: Env): Promise<void> {
    const now = new Date().toISOString();

    try {
      // Get expired articles first to clean up their images
      const expiredArticles = await env.DB.prepare(
        'SELECT uid FROM articles WHERE cache_expiry < ?'
      )
        .bind(now)
        .all<{ uid: string }>();

      // Delete expired images from R2 and database
      for (const article of expiredArticles.results || []) {
        const images = await this.getCachedImages(env, article.uid);

        // Delete from R2
        for (const image of images) {
          try {
            await env.R2.delete(image.r2_path);
          } catch (error) {
            console.error(`Failed to delete image from R2: ${image.r2_path}`, error);
          }
        }

        // Delete from images table
        await env.DB.prepare('DELETE FROM images WHERE article_uid = ?').bind(article.uid).run();
      }

      // Delete expired articles
      await env.DB.prepare('DELETE FROM articles WHERE cache_expiry < ?').bind(now).run();
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }
}
