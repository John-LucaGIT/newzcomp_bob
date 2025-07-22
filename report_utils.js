const axios = require('axios');
const { JSDOM } = require('jsdom');
require('dotenv').config();
const { Readability } = require('@mozilla/readability');


// SerpAPI setup
const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_ENDPOINT = 'https://serpapi.com/search.json';

// OpenAI setup
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Generate search query using OpenAI
async function generateSearchQueryFromArticle({ title, description }) {
  const prompt = `
    You are a news search expert.

    Given the following article title and description, create a string of KEYWORDS that captures the **topic** of the article.
    Use operators like quotes ("") for phrases, AND, OR, NOT if needed.
    Keep it under 500 characters.

    TITLE: "${title}"
    DESCRIPTION: "${description}"

    Return only the search query, nothing else.
  `;

  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  // console.log('GPT Response:', gptResponse);

  const searchQuery = gptResponse.choices[0].message.content.trim();
  // console.log('Generated Search Query:', searchQuery);
  return searchQuery;
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


// Scrape articles (basic for MVP)
async function scrapeArticles(relatedArticles) {
  const max = 4;
  const out = [];

  for (let art of relatedArticles.slice(0, max)) {
    const fullText = await fetchFullArticleText(art.url);
    out.push({
      source: art.source.name,
      title: art.title,
      url: art.url,
      date: art.publishedAt,
      text: fullText || '',
    });
  }

  return out;
}

// Analyze articles with OpenAI
async function analyzeArticlesWithAI(articles) {
  const payload = articles.map((a) => ({
    source: a.source,
    title: a.title,
    text: a.text.slice(0, 40_000),
  }));

  const prompt = `
  Your name is Bob, you are a professional news analyst trained to detect Bias.

  **Bob's Summary:**
  (((Summary of the story)))

  **Bob's Bias Analysis:** (Do this for each source)
  - Source: [source name]
  - Title: [title]
  - Bias Rating: [0-5] and Bias Direction: [left/right/neutral]
  - Bias Analysis: [analysis]

  **What the sources agree on:**
  (((Facts all sources agree on)))

  **Bob's Conclusion:**
  (((Conclusion based on the analysis, provide an in-depth conclusion of your analysis, explain your reasoning and how you arrived at your conclusion as well as the reasoning for your ratings.)))
  **Bob's Recommendations:**
  (((Recommendations for the reader)))

  Here are the articles:

  ${JSON.stringify(payload, null, 2)}

  Return a structured report in Markdown.
`;
  console.log('Payload for OpenAI:', payload);

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  if (!resp.choices?.length) {
    throw new Error('OpenAI returned no choices');
  }
  return resp.choices[0].message.content.trim();
}


// Analyze articles with OpenAI
async function analyzeArticlesWithAINew(articles) {
  const payload = articles.map((a) => ({
    source: a.source,
    title: a.title,
    text: a.text.slice(0, 40_000),
  }));

  const prompt = `
  Your name is Bob, you are a professional news analyst trained to detect Bias.

  **Bob's Summary:**
  (((Summary of the story)))

  **Bob's Bias Analysis:** (Do this for each source)
  - Source: [source name]
  - Title: [title]
  - Bias Rating: [0-5] and Bias Direction: [left/right/neutral]
  - Bias Analysis: [analysis]

  **What the sources agree on:**
  (((Facts all sources agree on)))

  **Bob's Conclusion:**
  (((Conclusion based on the analysis, provide an in-depth conclusion of your analysis, explain your reasoning and how you arrived at your conclusion as well as the reasoning for your ratings.)))
  **Bob's Recommendations:**
  (((Recommendations for the reader)))

  Here are the articles:

  ${JSON.stringify(payload, null, 2)}

  Return a structured report in JSON format. Add relevant key value pairs such as bias_rating, bias_direction, summary, sources_agree_on, conclusion, recommendations, reasoning, and topic.
  For the summary you should summarize the articles in a few sentences, focusing on the main points and themes.
  For the bias analysis, provide a detailed analysis of the bias present in each article, including the bias rating and direction.
  The sources_agree_on should summarize what all sources agree on, while the conclusion should provide an overall conclusion based on the analysis.
  The recommendations should provide actionable advice for readers and for media outlets.
  The reasoning should explain how you arrived at your conclusions and ratings.

  For the "topic" key, assign one of the following values ONLY: "all", "politics", "technology", "business", "health", "world", "sports", "entertainment", "science", "environment", "education", "breaking".

  Please provide a detailed response and analyze each article thoroughly.

  Important: Please note, if you are only provided with one article OR if the additional articles are the exact same, do not return your analysis as if you are comparing articles. Instead, treat it as a single article analysis.
  Also add to the recommendations that readers should seek additional perspectives especially in a case where only one article was found by you.

  This is how your output will be structured:
  {
    "summary": "The articles discuss...",
    "bias" : [{
      "source": "CNN",
      "title": "Man dies after being pulled into an MRI by a metal chain he wore, police say",
      "bias_rating": 2,
      "bias_direction": "neutral",
      "bias_analysis": "CNN's report on the MRI-related accident is straightforward, delivering factual information on the circumstances surrounding the incident. The article highlights the importance of safety around MRI machines without inserting opinion or speculative content. The narrative is factual, with an emphasis on reported details, indicating a neutral stance."
    }],
    "bias_rating": 3, -- Overall bias rating for the collective narrative
    "bias_direction": "left", -- Overall bias direction for the collective narrative
    "sources_agree_on": "Both sources agree that...",
    "conclusion": "The collective narrative from the articles presents...", -- You should add specific details on each article's contribution to the overall narrative and point out any biases and inconsistencies.
    "recommendations": "Readers should seek additional perspectives to understand...",
    "reasoning": "The analysis was based on the content of the articles, focusing on the language used, the framing of the issues, and the overall tone. The bias rating was determined by evaluating the presence of emotionally charged language, selective reporting, and the balance of viewpoints presented.",
    "topic": "politics" -- assign one of: "all", "politics", "technology", "business", "health", "world", "sports", "entertainment", "science", "environment", "education", "breaking"
  }
`;
  console.log('Payload for OpenAI:', payload);

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const outputPath = path.join(__dirname, 'ai_analysis_output.json');
  fs.writeFileSync(outputPath, resp.choices[0].message.content.trim());
  console.log(`AI analysis output written to ${outputPath}`);

  if (!resp.choices?.length) {
    throw new Error('OpenAI returned no choices');
  }
  return resp.choices[0].message.content.trim();
}

module.exports = {
  extractKeywords, fetchRelatedArticles, scrapeArticles, analyzeArticlesWithAI, analyzeArticlesWithAINew, getArticleInfo
};