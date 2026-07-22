use std::sync::{Arc, Mutex};
use std::time::Duration;
use rusqlite::Connection;
use log::error;

use crate::db::models::{ParsedFeed, ParsedItem};
use crate::db::{feed as db_feed, subscription as db_sub, entry as db_entry};
use super::cleanup;

pub struct FeedService {
    pub client: reqwest::Client,
}

impl FeedService {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (compatible; RSSReader/1.0)")
            .build()
            .expect("Failed to create HTTP client");
        Self { client }
    }

    pub async fn fetch_feed(&self, url: &str) -> Result<ParsedFeed, String> {
        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch feed: {}", e))?;

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let feed =
            feed_rs::parser::parse(&bytes[..]).map_err(|e| format!("Failed to parse feed: {}", e))?;

        let site_url = feed
            .links
            .iter()
            .find(|l| l.rel.as_deref() == Some("alternate"))
            .or_else(|| feed.links.first())
            .map(|l| l.href.clone())
            .unwrap_or_else(|| {
                url::Url::parse(url)
                    .ok()
                    .map(|u| {
                        format!(
                            "{}://{}",
                            u.scheme(),
                            u.host_str().unwrap_or("")
                        )
                    })
                    .unwrap_or_default()
            });

        let items = feed
            .entries
            .iter()
            .map(|entry| {
                let entry_url = entry
                    .links
                    .iter()
                    .find(|l| l.rel.as_deref() == Some("alternate"))
                    .or_else(|| entry.links.first())
                    .map(|l| l.href.clone());

                let published_at = entry.published.or(entry.updated).map(|dt| dt.timestamp());

                let thumbnail = extract_thumbnail(entry);

                crate::db::models::ParsedItem {
                    title: entry.title.as_ref().map(|t| t.content.clone()),
                    url: entry_url,
                    content: entry.content
                        .as_ref()
                        .and_then(|c| c.body.clone())
                        .or_else(|| entry.media.iter().find_map(|m| m.description.as_ref().map(|d| d.content.clone()))),
                    author: entry.authors.first().map(|a| a.name.clone()),
                    published_at,
                    thumbnail,
                }
            })
            .collect();

        Ok(ParsedFeed {
            title: feed.title.as_ref().map(|t| t.content.clone()),
            description: feed.description.as_ref().map(|d| d.content.clone()),
            site_url: Some(site_url),
            items,
        })
    }

    fn filter_items_by_retention(conn: &Connection, items: Vec<ParsedItem>) -> Vec<ParsedItem> {
        let days = match cleanup::get_cleanup_days(conn) {
            Some(d) => d,
            None => return items,
        };
        let cutoff = chrono::Utc::now().timestamp() - days * 86400;
        items
            .into_iter()
            .filter(|i| i.published_at.map_or(true, |ts| ts >= cutoff))
            .collect()
    }

    pub async fn add_and_subscribe(
        &self,
        conn: &Arc<Mutex<Connection>>,
        url: &str,
        category_id: Option<&str>,
    ) -> Result<String, String> {
        // Resolve YouTube URLs to RSS feed URLs
        let feed_url = if is_youtube_url(url) {
            resolve_youtube_url(&self.client, url).await?
        } else {
            url.to_string()
        };

        let parsed = self.fetch_feed(&feed_url).await?;

        let site_url = parsed.site_url.as_deref().unwrap_or("");
        let favicon_url = get_favicon_url(site_url);

        let (feed_id, _is_new) = {
            let db = conn.lock().map_err(|e| e.to_string())?;
            db_feed::upsert_feed(
                &db,
                &feed_url,
                parsed.title.as_deref(),
                parsed.description.as_deref(),
                Some(site_url),
                Some(&favicon_url),
            )
            .map_err(|e| e.to_string())?
        };

        {
            let db = conn.lock().map_err(|e| e.to_string())?;
            db_sub::add_subscription(&db, &feed_id, category_id).map_err(|e| e.to_string())?;
        }

        if !parsed.items.is_empty() {
            let db = conn.lock().map_err(|e| e.to_string())?;
            let items = Self::filter_items_by_retention(&db, parsed.items);
            if !items.is_empty() {
                db_entry::upsert_entries(&db, &feed_id, &items).map_err(|e| e.to_string())?;
            }
        }

        Ok(feed_id)
    }

    pub async fn refresh_feed(
        &self,
        conn: &Arc<Mutex<Connection>>,
        feed_id: &str,
    ) -> Result<usize, String> {
        let feed_url = {
            let db = conn.lock().map_err(|e| e.to_string())?;
            let feed = db_feed::get_feed_by_id(&db, feed_id).map_err(|e| e.to_string())?;
            match feed {
                Some(f) => f.url,
                None => return Ok(0),
            }
        };

        match self.fetch_feed(&feed_url).await {
            Ok(parsed) => {
                let new_count = {
                    let db = conn.lock().map_err(|e| e.to_string())?;
                    let items = Self::filter_items_by_retention(&db, parsed.items);
                    db_entry::upsert_entries(&db, feed_id, &items)
                        .map_err(|e| e.to_string())?
                };
                {
                    let db = conn.lock().map_err(|e| e.to_string())?;
                    db_feed::update_feed_last_fetched(&db, feed_id, false, None)
                        .map_err(|e| e.to_string())?;
                }
                Ok(new_count)
            }
            Err(err) => {
                let db = conn.lock().map_err(|e| e.to_string())?;
                db_feed::update_feed_last_fetched(&db, feed_id, true, Some(&err))
                    .map_err(|e| e.to_string())?;
                Ok(0)
            }
        }
    }

    pub async fn refresh_all(&self, conn: &Arc<Mutex<Connection>>) -> Result<(), String> {
        let feed_ids: Vec<String> = {
            let db = conn.lock().map_err(|e| e.to_string())?;
            let subs = db_sub::get_subscriptions(&db).map_err(|e| e.to_string())?;
            let mut unique: Vec<String> = subs.into_iter().map(|s| s.feed_id).collect();
            unique.sort();
            unique.dedup();
            unique
        };

        for chunk in feed_ids.chunks(5) {
            for id in chunk {
                let conn_clone = Arc::clone(conn);
                let service = FeedService::new();
                if let Err(e) = service.refresh_feed(&conn_clone, id).await {
                    error!("Feed refresh error for {}: {}", id, e);
                }
            }
        }

        Ok(())
    }
}

pub async fn fetch_article_content(url: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (compatible; RSSReader/1.0)")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    let html = response.text().await.map_err(|e| e.to_string())?;

    let mut readability = dom_smoothie::Readability::new(html.clone(), Some(url), None)
        .map_err(|e| format!("Readability init error: {}", e))?;

    match readability.parse() {
        Ok(article) => Ok(article.content.to_string()),
        Err(_) => Ok(html),
    }
}

fn get_favicon_url(site_url: &str) -> String {
    format!(
        "https://www.google.com/s2/favicons?domain={}&sz=32",
        site_url
    )
}

fn is_youtube_url(url: &str) -> bool {
    url.contains("youtube.com/@")
        || url.contains("youtube.com/channel/")
        || url.contains("youtube.com/c/")
        || url.contains("youtube.com/user/")
}

fn extract_channel_id_from_html(html: &str) -> Option<String> {
    // Try canonical link first: <link rel="canonical" href="https://www.youtube.com/channel/UCxxxx">
    let re_canonical = regex::Regex::new(r#"<link\s+rel="canonical"\s+href="https?://www\.youtube\.com/channel/(UC[^\"]+)""#).ok()?;
    if let Some(caps) = re_canonical.captures(html) {
        return caps.get(1).map(|m| m.as_str().to_string());
    }

    // Try meta tag: <meta property="og:url" content="https://www.youtube.com/channel/UCxxxx">
    let re_og = regex::Regex::new(r#"<meta\s+property="og:url"\s+content="https?://www\.youtube\.com/channel/(UC[^"]+)""#).ok()?;
    if let Some(caps) = re_og.captures(html) {
        return caps.get(1).map(|m| m.as_str().to_string());
    }

    // Try externalId in page data
    let re_external = regex::Regex::new(r#""externalId"\s*:\s*"(UC[^"]+)""#).ok()?;
    if let Some(caps) = re_external.captures(html) {
        return caps.get(1).map(|m| m.as_str().to_string());
    }

    None
}

async fn resolve_youtube_url(client: &reqwest::Client, url: &str) -> Result<String, String> {
    // If already an RSS URL, pass through
    if url.contains("youtube.com/feeds/videos.xml") {
        return Ok(url.to_string());
    }

    // Extract channel ID from URL if it's a /channel/UCxxxx format
    if let Some(idx) = url.find("/channel/") {
        let rest = &url[idx + 9..];
        if let Some(end) = rest.find(|c: char| c == '/' || c == '?' || c == '#') {
            let channel_id = &rest[..end];
            if channel_id.starts_with("UC") {
                return Ok(format!(
                    "https://www.youtube.com/feeds/videos.xml?channel_id={}",
                    channel_id
                ));
            }
        } else if rest.starts_with("UC") {
            return Ok(format!(
                "https://www.youtube.com/feeds/videos.xml?channel_id={}",
                rest
            ));
        }
    }

    // For @username, /c/, /user/ — fetch page and extract channel ID
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch YouTube page: {}", e))?;

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read YouTube page: {}", e))?;

    let channel_id = extract_channel_id_from_html(&html)
        .ok_or("Could not find YouTube channel ID. The channel may be private or the URL format is unsupported.")?;

    Ok(format!(
        "https://www.youtube.com/feeds/videos.xml?channel_id={}",
        channel_id
    ))
}

fn extract_thumbnail(entry: &feed_rs::model::Entry) -> Option<String> {
    for media in &entry.media {
        if let Some(thumb) = media.thumbnails.first() {
            return Some(thumb.image.uri.clone());
        }
        if let Some(content) = media.content.first() {
            if let Some(url) = &content.url {
                return Some(url.to_string());
            }
        }
    }

    let content_str = entry
        .content
        .as_ref()
        .and_then(|c| c.body.as_deref())
        .or_else(|| entry.summary.as_ref().map(|s| s.content.as_str()))?;

    let document = scraper::Html::parse_document(content_str);
    let img_selector = scraper::Selector::parse("img").ok()?;
    document
        .select(&img_selector)
        .next()
        .and_then(|el| el.value().attr("src").map(|s| s.to_string()))
}
