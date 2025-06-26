export const getArticle = async (id: string, currentURL: string) => {
  const apiUrl = `${currentURL}/api/news/opengraph?id=${encodeURIComponent(id)}`;
  const bungieUrl = `https://www.bungie.net/7/en/News/Article/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('[Astro] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: apiUrl,
        id,
      });

      try {
        const errorBody = await response.text();
        console.error('[Astro] API error response:', errorBody);
      } catch (bodyErr) {
        if (bodyErr instanceof Error) {
          console.error('[Astro] Failed to read error response body:', {
            message: bodyErr.message,
            stack: bodyErr.stack,
            url: apiUrl,
            id,
          });
        } else {
          console.error('[Astro] Failed to read error response body:', bodyErr);
        }
      }

      throw new Error(`API returned ${response.status}`);
    }

    const data = (await response.json()) as Record<string, any>;

    if (!data.openGraph || Object.keys(data.openGraph).length === 0) {
      console.warn(`[Astro] No OpenGraph data found for article with id: ${id}`);
      return {
        title: data.title || 'Untitled Article',
        openGraph: {},
        bungieUrl: bungieUrl,
        imageUrl: '',
        description: '',
      };
    }

    return {
      title: data.title,
      openGraph: data.openGraph,
      bungieUrl: bungieUrl,
      imageUrl: data.openGraph['image'] || '',
      description: data.openGraph['description'] || '',
    };
  } catch (err) {
    if (err instanceof Error) {
      console.error('[Astro] Error fetching OpenGraph data:', {
        message: err.message,
        stack: err.stack,
        url: apiUrl,
        id,
      });
    } else {
      console.error('[Astro] Unexpected error:', err);
    }
  }
};
