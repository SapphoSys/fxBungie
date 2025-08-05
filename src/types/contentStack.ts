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
