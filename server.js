// server.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');
require('dotenv').config();
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const { asyncFunction, getHistoricArticleMetadata, getHistoricArticleById, closePool } = require('./dbconnect');

const allowedOrigins = ['https://bob.newzcomp.com', 'http://localhost:5173', 'https://localhost:5173', 'http://localhost:3001', 'https://localhost:3001', 'http://192.168.86.240:5173'];

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like from Postman or Curl)
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// For HTTPS setup, uncomment the following lines and provide your certificate files
// const options = {
//   key: fs.readFileSync(''), // Certbot private key
//   cert: fs.readFileSync(''), // Certbot certificate
//   ca: fs.readFileSync(''), // Optional: if you have a chain file (some setups may include this)
// };

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(morgan('combined'));

// OpenAI setup
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// SerpAPI setup
const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_ENDPOINT = 'https://serpapi.com/search.json';

// Create a rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiter to all requests
app.use(limiter);

// ===== MAIN ANALYZE ENDPOINT =====
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const validator = require('validator');

    // Check if URL is valid
    if (!url || !validator.isURL(url)) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    const keyword = await extractKeywords(url);
    const relatedArticles = await fetchRelatedArticles(keyword, url);
    console.log('Related Articles:', relatedArticles);
    if (!relatedArticles.length) {
      return res.status(404).json({ error: 'No related articles found' });
    }
    const scrapedArticles = await scrapeArticles(relatedArticles);
    console.log('Scraped Articles:', scrapedArticles);
    if (!scrapedArticles.length) {
      return res.status(404).json({ error: 'No articles scraped' });
    }
    const analysis = await analyzeArticlesWithAI(scrapedArticles);
    res.json({
      analysis,
      related_articles: scrapedArticles.map((article) => ({
        source: article.source,
        title: article.title,
        url: article.url,
        content: article.text,
      })),
    });

    // Save to DB
    const title = scrapedArticles[0].title;
    const source_url = url;
    const source_name = scrapedArticles[0].source;
    const analysisData = {
      analysis,
      related_articles: scrapedArticles.map((article) => ({
        source: article.source,
        title: article.title,
        url: article.url,
        content: article.text,
      })),
    };
    console.log('Saving to DB:', { title, analysisData, source_url });
    try {
      await asyncFunction(title, analysisData, source_name, source_url);
      console.log('Data saved to DB');
    } catch (err) {
      console.error('Error saving to DB:', err);
    }

    // After sending response to client
    const cleanedBody = JSON.stringify(req.body, null, 2).slice(0, 400); // Limit to avoid huge SMS

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';

    const responseTime = res.getHeader('X-Response-Time') || 'Unknown';
    const responseStatus = res.statusCode;

    const messageBody = `
    📰 NewzComp Analysis Request | BOB

      🔍 /analyze endpoint used
      🕒 ${new Date().toLocaleString()}
      🌐 IP: ${requestIP}
      📱 UA: ${userAgent}
      📦 Payload: ${cleanedBody}
      ✅ Response Status: ${responseStatus}
      ⏱️ Response Time: ${responseTime}

      🔑 Generated Search Query: ${keyword}

      📊 Bob's Analysis: ${analysis.slice(0, 800)}...
    `.trim();

    // try {
    //   await client.messages.create({
    //     body: messageBody,
    //     from: process.env.TWILIO_PHONE_FROM,
    //     to: process.env.TWILIO_PHONE_TO,
    //   });
    //   console.log('Twilio notification sent.');
    // } catch (err) {
    //   console.error('Failed to send Twilio SMS:', err.message);
    // }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Get All Article Metadata =====


// Endpoint to get metadata for all articles
app.get('/articles', async (req, res) => {
  try {
    let articles = await getHistoricArticleMetadata(); // Fetch all articles metadata from the database
    articles = articles.map(article => ({
      ...article,
      bobid: article.bobid?.toString(),
    }));
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles metadata:', error.message);
    res.status(500).json({ error: 'Failed to fetch articles metadata' });
  }
});

// Endpoint to get a specific article by ID
app.get('/articles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const article = await getHistoricArticleById(id); // Fetch specific article by ID from the database
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    if (typeof article.bobid === 'bigint') {
      article.bobid = article.bobid.toString();
    }
    res.json(article);
  } catch (error) {
    console.error(`Error fetching article with ID ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// ===== Helper Functions =====

// 1. Extract article title and description
async function getArticleInfo(url) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const title = document.querySelector('meta[property="og:title"]')?.content || document.querySelector('title')?.textContent || '';

    const description = document.querySelector('meta[property="og:description"]')?.content || document.querySelector('meta[name="description"]')?.content || '';

    return { title: title.trim(), description: description.trim() };
  } catch (error) {
    console.error('Error extracting article info:', error.message);
    return { title: '', description: '' };
  }
}

// 2. Generate search query using OpenAI
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
    return 'latest news';
  }
  const searchQuery = await generateSearchQueryFromArticle(articleInfo);
  return searchQuery || articleInfo.title;
}

// 4. Fetch related articles (using SerpAPI instead of NewsAPI)
async function fetchRelatedArticles(keyword, sourceUrl) {
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

    const articles = serpArticles.map((article) => ({
      source: { name: article.source },
      title: article.title,
      url: article.link,
      publishedAt: article.date || new Date().toISOString(),
      content: article.snippet || '',
    }));

    // Add the original source article if not included
    const found = articles.some((a) => normalizeUrl(a.url) === normalizeUrl(sourceUrl));

    if (!found) {
      const { title, description } = await getArticleInfo(sourceUrl);
      const sourceName = new URL(sourceUrl).hostname.replace('www.', '');
      articles.unshift({
        source: { name: sourceName },
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

// 5. Normalize URL (remove query params etc.)
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch (e) {
    return url;
  }
}

// 6. Scrape articles (basic for MVP)
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

// 7. Analyze articles with OpenAI
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
  console.log('Prompt for OpenAI:', prompt);
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

// ===== Start the server =====
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  try {
    await closePool();
    console.log('Database connection pool closed.');
  } catch (err) {
    console.error('Error closing database connection pool:', err.message);
  }
  process.exit(0);
});

// For HTTPS setup, uncomment the following lines and provide your certificate files

// // Start the HTTPS server
// https.createServer(options, app).listen(port, () => {
//   console.log(`HTTPS server is running on https://localhost:${port}`);
// });

// // Redirect HTTP traffic to HTTPS
// http.createServer((req, res) => {
//   res.writeHead(301, { "Location": `https://${req.headers['host']}${req.url}` });
//   res.end();
// }).listen(80, () => {
//   console.log('HTTP server is running on http://localhost:80 (redirecting to HTTPS)');
// });
