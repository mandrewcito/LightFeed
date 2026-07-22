export interface Feed {
  id: string
  url: string
  title: string | null
  description: string | null
  site_url: string | null
  image_url: string | null
  last_fetched_at: number | null
  fetch_error: string | null
  fetch_interval: number
}

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface Subscription {
  id: string
  feed_id: string
  category_id: string | null
  custom_title: string | null
  sort_order: number
  created_at: number
}

export interface FeedWithCategory extends Feed {
  category_id: string | null
  subscription_id: string
  custom_title: string | null
  sort_order: number
}

export interface Entry {
  id: string
  feed_id: string
  title: string | null
  url: string | null
  content: string | null
  readable_content: string | null
  author: string | null
  published_at: number | null
  fetched_at: number
  has_read: boolean
  starred: boolean
  thumbnail: string | null
}

export interface EntryWithFeed extends Entry {
  feed_title: string | null
  feed_image_url: string | null
}

export interface EntryFilter {
  feed_id?: string
  category_id?: string
  starred?: boolean
  unread_only?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface UnreadCounts {
  [key: string]: number
}

export interface ParsedFeed {
  title: string | null
  description: string | null
  site_url: string | null
  items: ParsedItem[]
}

export interface ParsedItem {
  title: string | null
  url: string | null
  content: string | null
  author: string | null
  published_at: number | null
  thumbnail: string | null
}
