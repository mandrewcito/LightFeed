use std::fmt::Write;

pub fn build_opml(data: &[(String, Option<String>, Option<String>)]) -> String {
    let mut by_category: std::collections::HashMap<String, Vec<&(String, Option<String>, Option<String>)>> = std::collections::HashMap::new();
    let mut uncategorized = Vec::new();

    for item in data {
        match &item.2 {
            Some(cat) => {
                by_category.entry(cat.clone()).or_default().push(item);
            }
            None => {
                uncategorized.push(item);
            }
        }
    }

    let mut opml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head>
  <title>LightFeed Subscriptions</title>
</head>
<body>
"#,
    );

    for (cat, feeds) in &by_category {
        let _ = writeln!(opml, "  <outline text=\"{}\">", escape_xml(cat));
        for f in feeds {
            let title = f.1.as_deref().unwrap_or(&f.0);
            let _ = writeln!(
                opml,
                "    <outline type=\"rss\" text=\"{}\" xmlUrl=\"{}\" />",
                escape_xml(title),
                escape_xml(&f.0)
            );
        }
        opml.push_str("  </outline>\n");
    }

    for f in &uncategorized {
        let title = f.1.as_deref().unwrap_or(&f.0);
        let _ = writeln!(
            opml,
            "  <outline type=\"rss\" text=\"{}\" xmlUrl=\"{}\" />",
            escape_xml(title),
            escape_xml(&f.0)
        );
    }

    opml.push_str("</body>\n</opml>");
    opml
}

pub fn parse_opml_urls(content: &str) -> Vec<String> {
    let mut urls = Vec::new();
    // Simple regex-like extraction for xmlUrl="..."
    let mut remaining = content;
    while let Some(pos) = remaining.find("xmlUrl=\"") {
        let start = pos + 8;
        if let Some(end) = remaining[start..].find('"') {
            urls.push(remaining[start..start + end].to_string());
            remaining = &remaining[start + end + 1..];
        } else {
            break;
        }
    }
    urls
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
