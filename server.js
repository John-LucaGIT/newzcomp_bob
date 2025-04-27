// server.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const cors = require('cors');


require('dotenv').config();

const app = express();
app.use(cors());

const port = process.env.PORT || 3001;

// Setup Middleware
app.use(bodyParser.json());

// Setup OpenAI
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// NewsAPI
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/everything';

// ===== MAIN ANALYZE ENDPOINT =====
app.post("/analyze", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const keyword         = await extractKeywords(url);
    const relatedArticles = await fetchRelatedArticles(keyword, url);
    const scrapedArticles = await scrapeArticles(relatedArticles);
    // return res.json({ scrapedArticles });
    const analysis        = await analyzeArticlesWithAI(scrapedArticles);

    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ===== Helper Functions =====

// 1. Extract article title and description
async function getArticleInfo(url) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const title = document.querySelector('meta[property="og:title"]')?.content
                || document.querySelector('title')?.textContent
                || "";

    const description = document.querySelector('meta[property="og:description"]')?.content
                      || document.querySelector('meta[name="description"]')?.content
                      || "";

    return { title: title.trim(), description: description.trim() };
  } catch (error) {
    console.error('Error extracting article info:', error.message);
    return { title: "", description: "" };
  }
}

// 2. Generate search query using OpenAI
async function generateSearchQueryFromArticle({ title, description }) {
  console.log('Generating search query from article:', { title, description });
  const prompt = `
  You are a news search expert.

  Given the following article title and description, create a string of KEYWORDS that captures the **topic** or **headline** of the article. This query will be used to find **related articles from different news sources** with potentially different perspectives. Focus on the **most important topics and keywords**, removing any redundant or overly specific terms. Use operators like quotes ("") for phrases, AND, OR, NOT if needed. The goal is to make the query **as concise as possible** while still capturing the key ideas.
  For example if the title is: "Wisconsin judge’s arrest for alleged ICE interference is ‘fueling both parties,’ says Stef Kight" the keyword could be: "Wisconsin AND judge AND "ICE" AND ARREST", please feel free to include variations of acceptable keyword searches by using the OR operator.

  Here is the format that is allowed for keyword:

  Keywords or phrases to search for in the article title and body.

  Advanced search is supported here:

  Surround phrases with quotes (") for exact match.
  Prepend words or phrases that must appear with a + symbol. Eg: +bitcoin
  Prepend words that must not appear with a - symbol. Eg: -bitcoin
  Alternatively you can use the AND / OR / NOT keywords, and optionally group these with parenthesis. Eg: crypto AND (ethereum OR litecoin) NOT bitcoin.

  Keep it under 500 characters.

  TITLE: "${title}"
  DESCRIPTION: "${description}"


  Return only the search query, nothing else.
`;

  const gptResponse = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });
  console.log('GPT Response:', gptResponse);

  const searchQuery = gptResponse.choices[0].message.content.trim();
  console.log('Generated Search Query:', searchQuery);
  return searchQuery;
}

// 3. Keyword extraction
async function extractKeywords(url) {
  const articleInfo = await getArticleInfo(url);
  if (!articleInfo.title) {
    console.warn("No title found, fallback to 'latest news'");
    return "latest news";
  }
  const searchQuery = await generateSearchQueryFromArticle(articleInfo);
  return searchQuery || articleInfo.title;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname; // Ignore query parameters, fragments, etc.
  } catch (e) {
    return url; // If parsing fails, fallback to raw URL
  }
}

// 4. Fetch related articles
async function fetchRelatedArticles(keyword, sourceUrl) {
  try {
    const response = await axios.get(NEWS_API_ENDPOINT, {
      params: {
        q: keyword,
        apiKey: NEWS_API_KEY,
        sortBy: "relevancy",
        pageSize: 10, // fetch 10 to pick best 4 later
      },
    });

    let articles = response.data.articles || [];

    // Check if the source article URL is already in the list
    const found = articles.some(article => normalizeUrl(article.url) === normalizeUrl(sourceUrl));

    if (!found) {
      // If not found, manually add a placeholder article for the source URL
      articles.unshift({
        source: { name: "Source Article" },
        title: "Source Article",
        url: sourceUrl,
        publishedAt: new Date().toISOString(),
        content: "" // We'll scrape the real content later
      });
    }

    return articles;
  } catch (error) {
    console.error('Error fetching related articles:', error.message);
    return [];
  }
}
// 5. Scrape articles (basic for MVP)
async function scrapeArticles(relatedArticles) {
  const max = 4;
  const out = [];

  // Scrape and add related articles (up to max number)
  for (let art of relatedArticles.slice(0, max)) {
    const fullText = await fetchFullArticleText(art.url);
    out.push({
      source: art.source.name,
      title: art.title,
      url: art.url,
      date: art.publishedAt,
      text: fullText || ""  // Always use the scraped version
    });
  }

  return out;
}


async function fetchFullArticleText(url) {
  try {
    // 1. Fetch raw HTML
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    // 2. Parse with JSDOM
    const dom = new JSDOM(html, {
      url,
      contentType: 'text/html'
    });

    // 3. Run Readability
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    // 4. Get first 200 words of article
    const first200Words = article?.textContent?.split(/\s+/).slice(0, 200).join(' ');

    return first200Words || null; // Return the first 200 words
  } catch (err) {
    console.error(`Error fetching article content from ${url}:`, err.message);
    return null;
  }
}


// 6. Analyze articles with OpenAI
async function analyzeArticlesWithAI(articles) {
  // Build a cleaner JSON snippet:
  const payload = articles.map(a => ({
    source: a.source,
    title:  a.title,
    text:   a.text.slice(0, 40_000)  // truncate to ~40k chars to stay under token limits
  }));

  const prompt = `
  Your name is Bob, you are a professional news analyst trained to detect Bias. Your main goal is to state the facts of some news story and point out biases and language that lead readers to a certain conclusion. Given x news sources you will provide a summary of the facts (what all sources have in common and what seems to be factually accurate) and you may point out the biases of the different sources.

  Your output should be structured as such:

  **Bob's Summary:**
  (((Summary of the story)))

  **Bob's Bias Analysis:**

  Includes a Bias Rating:
    Create a numeric bias rating between 0 and 5.".

    bias_rating:

    - 0 = No bias (Neutral)
    - 1–2 = Slight bias
    - 3–4 = Noticeable bias
    - 5 = Strong bias

  A bias direction:
    Can be one of the following:

    "left" (liberal/progressive leaning)
    "right" (conservative leaning)
    "neutral" (no clear political leaning)

  The analysis should be structured as such:

  - Source: [source name]
  - Title: [title]
  - Bias Rating: [0-5] and Bias Direction: [left/right/neutral]
  - Bias Analysis: [analysis of the article, including quotes and language that is biased with the explanation of why it is biased]

  **What the sources agree on:**
  (((This section should include facts on what all sources agree on regardless of what they lean towards)))

  If you suspect one of the articles is reporting on something else entirley, please omit it and any related analysis from the output.

  Here are the articles (JSON array of {source, title, text}):

  ${JSON.stringify(payload, null, 2)}

  Return a structured report in Markdown.
`;

  const resp = await openai.chat.completions.create({
    model:    "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  if (!resp.choices?.length) {
    throw new Error("OpenAI returned no choices");
  }
  return resp.choices[0].message.content.trim();
}


// ===== Start the server =====
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
