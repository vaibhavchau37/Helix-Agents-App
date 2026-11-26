"""
News & Trends Fetcher
Pulls top tech tools, breakthroughs, and world business/macro news
via Hacker News API and curated RSS feeds without external dependencies.
"""

import json
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def fetch_hacker_news_top(limit: int = 6, timeout: int = 6) -> list:
    """Fetch top tech and tools discussions from Hacker News."""
    stories = []
    try:
        url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ids = json.loads(resp.read().decode("utf-8"))[:limit]

        for item_id in ids:
            item_url = f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
            item_req = urllib.request.Request(item_url, headers={"User-Agent": USER_AGENT})
            try:
                with urllib.request.urlopen(item_req, timeout=timeout) as item_resp:
                    item_data = json.loads(item_resp.read().decode("utf-8"))
                    if item_data and "title" in item_data:
                        stories.append({
                            "title": item_data.get("title"),
                            "url": item_data.get("url") or f"https://news.ycombinator.com/item?id={item_id}",
                            "score": item_data.get("score", 0),
                            "source": "HackerNews"
                        })
            except Exception:
                continue
    except Exception as e:
        print(f"[NewsFetcher] HN fetch notice: {e}")
    return stories

def fetch_rss_headlines(source_name: str, feed_url: str, limit: int = 4, timeout: int = 6) -> list:
    """Parse top headlines from an RSS or Atom feed."""
    items = []
    req = urllib.request.Request(feed_url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read()
            root = ET.fromstring(content)

            # RSS format (channel -> item)
            channel = root.find("channel")
            if channel is not None:
                for item in channel.findall("item")[:limit]:
                    title_elem = item.find("title")
                    link_elem = item.find("link")
                    if title_elem is not None and title_elem.text:
                        items.append({
                            "title": title_elem.text.strip(),
                            "link": link_elem.text.strip() if link_elem is not None and link_elem.text else "",
                            "source": source_name
                        })
            else:
                # Atom format (feed -> entry)
                # Handle atom namespace if present
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                entries = root.findall("atom:entry", ns) or root.findall("entry")
                for entry in entries[:limit]:
                    title_elem = entry.find("atom:title", ns) or entry.find("title")
                    link_elem = entry.find("atom:link", ns) or entry.find("link")
                    href = link_elem.attrib.get("href", "") if link_elem is not None else ""
                    if title_elem is not None and title_elem.text:
                        items.append({
                            "title": title_elem.text.strip(),
                            "link": href,
                            "source": source_name
                        })
    except Exception as e:
        print(f"[NewsFetcher] RSS error for {source_name}: {e}")
    return items

def fetch_all_news(rss_feeds_dict: dict, hn_limit: int = 6) -> dict:
    """Collects both Tech/Tools news and World Macro news."""
    tech_news = fetch_hacker_news_top(limit=hn_limit)
    for source_name, feed_url in rss_feeds_dict.get("tech", []):
        tech_news.extend(fetch_rss_headlines(source_name, feed_url, limit=3))

    world_macro = []
    for source_name, feed_url in rss_feeds_dict.get("macro_world", []):
        world_macro.extend(fetch_rss_headlines(source_name, feed_url, limit=4))

    return {
        "tech_and_tools": tech_news,
        "world_macro": world_macro
    }

