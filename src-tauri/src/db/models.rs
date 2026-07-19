use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feed {
    pub id: String,
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub site_url: Option<String>,
    pub image_url: Option<String>,
    pub last_fetched_at: Option<i64>,
    pub fetch_error: Option<String>,
    pub fetch_interval: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub subscription_id: String,
    pub feed_id: String,
    pub category_id: Option<String>,
    pub custom_title: Option<String>,
    pub sort_order: i32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub feed_id: String,
    pub title: Option<String>,
    pub url: Option<String>,
    pub content: Option<String>,
    pub readable_content: Option<String>,
    pub author: Option<String>,
    pub published_at: Option<i64>,
    pub fetched_at: i64,
    pub has_read: bool,
    pub starred: bool,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryWithFeed {
    #[serde(flatten)]
    pub entry: Entry,
    pub feed_title: Option<String>,
    pub feed_image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedWithSubscription {
    #[serde(flatten)]
    pub feed: Feed,
    pub category_id: Option<String>,
    pub subscription_id: Option<String>,
    pub custom_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EntryFilter {
    pub feed_id: Option<String>,
    pub category_id: Option<String>,
    pub starred: Option<bool>,
    pub unread_only: Option<bool>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReorderItem {
    pub id: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedItem {
    pub title: Option<String>,
    pub url: Option<String>,
    pub content: Option<String>,
    pub author: Option<String>,
    pub published_at: Option<i64>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFeed {
    pub title: Option<String>,
    pub description: Option<String>,
    pub site_url: Option<String>,
    pub items: Vec<ParsedItem>,
}
