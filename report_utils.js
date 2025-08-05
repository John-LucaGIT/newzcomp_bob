const axios = require('axios');
const { JSDOM } = require('jsdom');
require('dotenv').config();
const { searchNews, buildSearchParameters } = require('./googlenews.js')
const { Readability } = require('@mozilla/readability');
const {
  generateSearchQueryFromArticle,
  extractArticleConcepts,
  analyzeArticlesWithAI,
  analyzeArticlesWithAINew
} = require('./ai_utils.js');

// SerpAPI setup
const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_ENDPOINT = 'https://serpapi.com/search.json';

// File system for output
const fs = require('fs');
const path = require('path');

// Util Utils
// 1. Extract article title, description, imageUrl, and author
async function getArticleInfo(url) {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Title extraction with fallback logic
    let title =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="twitter:title"]')?.content ||
      document.querySelector('title')?.textContent ||
      document.querySelector('h1')?.textContent ||
      // Try first <h2> if h1 is missing
      document.querySelector('h2')?.textContent ||
      // Try first <header> element with text
      document.querySelector('header')?.textContent?.trim() ||
      // Try first <article> > <h1> or <h2>
      document.querySelector('article h1')?.textContent ||
      document.querySelector('article h2')?.textContent ||
      // Try first <div> with class containing "title" or "headline"
      document.querySelector('div[class*="title" i]')?.textContent ||
      document.querySelector('div[class*="headline" i]')?.textContent ||
      // Try first <span> with class containing "title" or "headline"
      document.querySelector('span[class*="title" i]')?.textContent ||
      document.querySelector('span[class*="headline" i]')?.textContent ||
      // As a last resort, look for the largest <b> or <strong> tag
      (() => {
      const candidates = Array.from(document.querySelectorAll('b, strong'))
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
      return candidates[0] || '';
      })() ||
      'Title not found';

    // Description extraction with fallback logic
    let description =
      document.querySelector('meta[property="og:description"]')?.content ||
      document.querySelector('meta[name="description"]')?.content ||
      document.querySelector('meta[name="twitter:description"]')?.content ||
      // Try first <p>
      document.querySelector('p')?.textContent ||
      // Try first <article> > <p>
      document.querySelector('article p')?.textContent ||
      // Try first <div> with class containing "summary" or "description"
      document.querySelector('div[class*="summary" i]')?.textContent ||
      document.querySelector('div[class*="description" i]')?.textContent ||
      // Try first <section> with class containing "summary" or "description"
      document.querySelector('section[class*="summary" i]')?.textContent ||
      document.querySelector('section[class*="description" i]')?.textContent ||
      // Try first <span> with class containing "summary" or "description"
      document.querySelector('span[class*="summary" i]')?.textContent ||
      document.querySelector('span[class*="description" i]')?.textContent ||
      // Try first <blockquote>
      document.querySelector('blockquote')?.textContent ||
      // Try first <li> (sometimes used for summaries)
      document.querySelector('li')?.textContent ||
      // As a last resort, try the first 200 characters of the body text
      (() => {
      const bodyText = document.body?.textContent?.trim() || '';
      return bodyText.slice(0, 200);
      })() ||
      '';

    // Image extraction with fallback logic
    let imageUrl =
      document.querySelector('meta[property="og:image"]')?.content ||
      document.querySelector('meta[name="twitter:image"]')?.content ||
      document.querySelector('link[rel="image_src"]')?.href ||
      document.querySelector('meta[itemprop="image"]')?.content ||
      document.querySelector('img[alt*="article" i]')?.src ||
      document.querySelector('img[alt*="news" i]')?.src ||
      document.querySelector('img[src*="article" i]')?.src ||
      document.querySelector('img[src*="news" i]')?.src ||
      document.querySelector('img')?.src ||
      '';

    // As a last resort, try to find the largest image on the page
    if (!imageUrl) {
      const images = Array.from(document.images)
      .map(img => ({
        src: img.src,
        area: (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0)
      }))
      .filter(img => img.src && img.area > 0)
      .sort((a, b) => b.area - a.area);
      if (images.length > 0) {
      imageUrl = images[0].src;
      }
    }

    // Author extraction (generic)
    let author =
      document.querySelector('meta[name="author"]')?.content ||
      document.querySelector('meta[property="article:author"]')?.content ||
      document.querySelector('meta[name="twitter:creator"]')?.content ||
      '';

    // Try to extract author from inline scripts (e.g., window.<source>.metadata)
    if (!author) {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent || '';
        // Look for window.<something>.metadata = {...}
        const match = text.match(/window\.(\w+)\.metadata\s*=\s*(\{[\s\S]*?\});/);
        if (match) {
          try {
            const metadata = JSON.parse(match[2]);
            if (metadata.content) {
              if (Array.isArray(metadata.content.author) && metadata.content.author.length > 0) {
                author = metadata.content.author.join(', ');
                break;
              } else if (typeof metadata.content.author === 'string') {
                author = metadata.content.author;
                break;
              } else if (metadata.content.byline) {
                author = metadata.content.byline;
                break;
              }
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    }

    // Clean up whitespace
    title = title.trim();
    description = description.trim();
    imageUrl = imageUrl.trim();
    author = author.trim();

    return { title, description, imageUrl, author };
  } catch (error) {
    console.error('Error extracting article info:', error.message);
    return { title: '', description: '', imageUrl: '', author: '' };
  }
}

// Normalize URL (remove query params etc.)
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch (e) {
    return url;
  }
}

async function fetchFullArticleText(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const dom = new JSDOM(html, { url, contentType: 'text/html' });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const first200Words = article?.textContent?.split(/\s+/).slice(0, 200).join(' ');
    return first200Words || null;
  } catch (err) {
    console.error(`Error fetching article content from ${url}:`, err.message);
    return null;
  }
}

// A better function to extract structured information
async function extractArticleConceptsFromUrl(url) {
  const articleInfo = await getArticleInfo(url);
  return await extractArticleConcepts(articleInfo);
}


// External Utils
async function extractKeywords(url) {
  const articleInfo = await getArticleInfo(url);
  console.log('Article Info:', articleInfo, url);
  if (!articleInfo.title) {
    console.warn("No title found, fallback to 'latest news'");
    return 'latest news';
  }
  const searchQuery = await generateSearchQueryFromArticle(articleInfo);
  return searchQuery || articleInfo.title;
}

// Fetch related articles (using SerpAPI instead of NewsAPI)
async function fetchRelatedArticles(keyword, sourceUrl, allowedDomains) {
  try {
    const response = await axios.get(SERP_API_ENDPOINT, {
      params: {
        q: keyword,
        tbm: 'nws', // Target Google News
        api_key: SERP_API_KEY,
        num: 10,
      },
    });

    const serpArticles = response.data.news_results || [];

    // Only include articles whose domain is in the allowedDomains whitelist
    const articles = serpArticles
      .filter((article) => {
        try {
          const domain = new URL(article.link).hostname.replace(/^www\./, '');
          return allowedDomains.some((allowed) => domain.endsWith(allowed));
        } catch {
          return false;
        }
      })
      .map((article) => ({
        source: { name: article.source },
        title: article.title,
        url: article.link,
        publishedAt: article.date || new Date().toISOString(),
        content: article.snippet || '',
      }));

    // Add the original source article if not included and if it's in the whitelist
    const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, '');
    const isSourceAllowed = allowedDomains.some((allowed) => sourceDomain.endsWith(allowed));
    const found = articles.some((a) => normalizeUrl(a.url) === normalizeUrl(sourceUrl));

    if (!found && isSourceAllowed) {
      const { title, description } = await getArticleInfo(sourceUrl);
      articles.unshift({
        source: { name: sourceDomain },
        title: title || 'Source Article',
        url: sourceUrl,
        publishedAt: new Date().toISOString(),
        content: description || '', // We'll scrape this manually later if needed
      });
    }

    return articles;
  } catch (error) {
    console.error('Error fetching related articles (SerpAPI):', error.message);
    return [];
  }
}

async function cleanGoogleArticles(articles, allowedDomains) {
  console.log('cleanGoogleArticles - Input articles:', articles?.length || 0);
  console.log('cleanGoogleArticles - Sample article structure:', articles?.[0]);

  const cleaned = [];
  if (!articles || !Array.isArray(articles)) {
    console.error('cleanGoogleArticles - Invalid articles input:', articles);
    return cleaned;
  }

  for (const article of articles) {
    try {
      // Handle both Google Custom Search API and SerpAPI structures
      const articleUrl = article.link || article.url;
      const articleTitle = article.title;
      const articleSnippet = article.snippet || article.content || '';
      const articleSource = article.displayLink || article.source || '';

      if (!articleUrl) {
        console.warn('cleanGoogleArticles - Article missing URL:', article);
        continue;
      }

      const domain = new URL(articleUrl).hostname.replace(/^www\./, '');
      console.log(`cleanGoogleArticles - Checking domain: ${domain}`);

      if (!allowedDomains.some((allowed) => domain.endsWith(allowed))) {
        console.log(`cleanGoogleArticles - Domain ${domain} not in allowed list`);
        continue;
      }

      console.log(`cleanGoogleArticles - Processing article from ${domain}: ${articleTitle}`);

      // Get additional article info
      const info = await getArticleInfo(articleUrl);

      const cleanedArticle = {
        source: { name: articleSource || domain || 'Unknown' },
        title: info.title || articleTitle || 'No title',
        url: articleUrl,
        publishedAt: article.date || new Date().toISOString(),
        content: info.description || articleSnippet || '',
      };

      console.log(`cleanGoogleArticles - Added article: ${cleanedArticle.title}`);
      cleaned.push(cleanedArticle);

    } catch (e) {
      console.error('cleanGoogleArticles - Error processing article:', e.message, article);
    }
  }

  console.log(`cleanGoogleArticles - Returning ${cleaned.length} cleaned articles`);
  return cleaned;
}


async function fetchRelatedArticlesGoogle(keyword, sourceUrl, allowedDomains) {
  try {
    const google_response = await searchNews(keyword)

    const serpArticles = response.data.news_results || [];

    // Only include articles whose domain is in the allowedDomains whitelist
    const articles = serpArticles
      .filter((article) => {
        try {
          const domain = new URL(article.link).hostname.replace(/^www\./, '');
          return allowedDomains.some((allowed) => domain.endsWith(allowed));
        } catch {
          return false;
        }
      })
      .map((article) => ({
        source: { name: article.source },
        title: article.title,
        url: article.link,
        publishedAt: article.date || new Date().toISOString(),
        content: article.snippet || '',
      }));

    // Add the original source article if not included and if it's in the whitelist
    const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, '');
    const isSourceAllowed = allowedDomains.some((allowed) => sourceDomain.endsWith(allowed));
    const found = articles.some((a) => normalizeUrl(a.url) === normalizeUrl(sourceUrl));

    if (!found && isSourceAllowed) {
      const { title, description } = await getArticleInfo(sourceUrl);
      articles.unshift({
        source: { name: sourceDomain },
        title: title || 'Source Article',
        url: sourceUrl,
        publishedAt: new Date().toISOString(),
        content: description || '', // We'll scrape this manually later if needed
      });
    }

    return articles;
  } catch (error) {
    console.error('Error fetching related articles (SerpAPI):', error.message);
    return [];
  }
}


// Scrape articles (basic for MVP)
async function scrapeArticles(relatedArticles) {
  console.log('scrapeArticles - Input:', relatedArticles?.length || 0, 'articles');
  console.log('scrapeArticles - Sample article:', relatedArticles?.[0]);

  const max = 4;
  const out = [];

  if (!relatedArticles || !Array.isArray(relatedArticles)) {
    console.error('scrapeArticles - Invalid input:', relatedArticles);
    return out;
  }

  for (let art of relatedArticles.slice(0, max)) {
    try {
      console.log(`scrapeArticles - Processing: ${art.title} from ${art.url}`);

      // Check if article object has required properties
      if (!art.url) {
        console.warn('scrapeArticles - Article missing URL:', art);
        continue;
      }

      const fullText = await fetchFullArticleText(art.url);
      console.log(`scrapeArticles - Scraped text length: ${fullText?.length || 0} characters`);

      const scrapedArticle = {
        source: art.source?.name || art.source || 'Unknown',
        title: art.title || 'No title',
        url: art.url,
        date: art.publishedAt || new Date().toISOString(),
        text: fullText || '',
      };

      console.log(`scrapeArticles - Added article: ${scrapedArticle.title}`);
      out.push(scrapedArticle);
    } catch (error) {
      console.error(`scrapeArticles - Error processing article ${art.url}:`, error.message);
    }
  }

  console.log(`scrapeArticles - Returning ${out.length} scraped articles`);
  return out;
}

module.exports = {
  extractKeywords, fetchRelatedArticles, scrapeArticles, analyzeArticlesWithAI, analyzeArticlesWithAINew, getArticleInfo, extractArticleConceptsFromUrl, cleanGoogleArticles
};