import Parser from 'rss-parser'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import {
  upsertFeed,
  addSubscription,
  upsertEntries,
  updateFeedLastFetched,
  getSubscriptions,
  getFeedById
} from './database'
import { getFaviconUrl } from './utils'
import type { ParsedFeed, ParsedItem } from '../renderer/types'

const rssParser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['content:encoded', 'fullContent']
    ]
  }
})

let schedulerInterval: ReturnType<typeof setInterval> | null = null

export class FeedService {
  async fetchFeed(url: string): Promise<{ feed: ParsedFeed; feedId: string; isNew: boolean }> {
    const parsed = await rssParser.parseURL(url)

    const siteUrl = parsed.link || new URL(url).origin
    const imageUrl = getFaviconUrl(siteUrl)

    const { id: feedId, isNew } = upsertFeed(
      url,
      parsed.title || null,
      parsed.description || null,
      siteUrl,
      imageUrl
    )

    const items: ParsedItem[] = (parsed.items || []).map((item) => {
      let thumbnail: string | null = null
      if (item.mediaContent && Array.isArray(item.mediaContent) && item.mediaContent.length > 0) {
        thumbnail = item.mediaContent[0]?.$.url || null
      }
      if (!thumbnail && item.fullContent) {
        thumbnail = extractThumbnailFromHtml(item.fullContent)
      }

      return {
        title: item.title || null,
        url: item.link || item.guid || null,
        content: item.fullContent || item.content || item.contentSnippet || null,
        author: item.creator || item.author || null,
        published_at: item.isoDate ? Math.floor(new Date(item.isoDate).getTime() / 1000) : null,
        thumbnail
      }
    })

    const feed: ParsedFeed = {
      title: parsed.title || null,
      description: parsed.description || null,
      site_url: siteUrl,
      items
    }

    return { feed, feedId, isNew }
  }

  async addAndSubscribe(url: string, categoryId?: string): Promise<string> {
    const { feedId, feed } = await this.fetchFeed(url)
    addSubscription(feedId, categoryId)
    if (feed.items.length > 0) {
      upsertEntries(feedId, feed.items)
    }
    return feedId
  }

  async refreshFeed(feedId: string): Promise<number> {
    const feed = getFeedById(feedId) as { url: string } | undefined
    if (!feed) return 0

    try {
      const { feed: parsed } = await this.fetchFeed(feed.url)
      const newCount = upsertEntries(feedId, parsed.items)
      updateFeedLastFetched(feedId, false)
      return newCount
    } catch (err) {
      updateFeedLastFetched(feedId, true, String(err))
      return 0
    }
  }

  async refreshAll(): Promise<void> {
    const subs = getSubscriptions()
    const feedIds = [...new Set(subs.map((s) => s.feed_id))]

    // Process in batches of 5
    for (let i = 0; i < feedIds.length; i += 5) {
      const batch = feedIds.slice(i, i + 5)
      await Promise.all(batch.map((id) => this.refreshFeed(id)))
    }
  }

  startScheduler(intervalMs: number): void {
    this.stopScheduler()
    // Initial fetch after 5 seconds
    setTimeout(() => this.refreshAll(), 5000)
    schedulerInterval = setInterval(() => this.refreshAll(), intervalMs)
  }

  stopScheduler(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
      schedulerInterval = null
    }
  }
}

export async function fetchArticleContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)' }
  })
  const html = await response.text()

  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  return article?.content || html
}

function extractThumbnailFromHtml(html: string): string | null {
  try {
    const dom = new JSDOM(html)
    const img = dom.window.document.querySelector('img')
    return img?.getAttribute('src') || null
  } catch {
    return null
  }
}
