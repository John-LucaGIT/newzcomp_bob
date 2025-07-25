// server.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');
require('dotenv').config();
const twilio = require('twilio');
const { parseAnalysisSection } = require('./decode.js');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const fetch = require('node-fetch');
const { getNewsArticles, findAllArticleLinks } = require('./googlenews');
const { asyncFunction, getHistoricArticleMetadata, getHistoricArticleById, closePool, loadAllowedDomains } = require('./dbconnect');
const allowedOrigins = ['https://bob.newzcomp.com', 'http://localhost:5173', 'https://localhost:5173', 'http://localhost:3001', 'https://localhost:3001', 'http://192.168.86.240:5173', 'http://192.168.86.231:5173', 'https://app.newzcomp.com', 'app.newzcomp.com','http://192.168.86.248:5173','http://192.168.86.52:3001'];
const app = express();
const port = process.env.PORT || 3001;
const { utils } = require('./utils');
const HOST = '192.168.86.52';
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS error: Origin ${origin} not allowed`);
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
    const allowedDomains = await loadAllowedDomains();
    console.log('Allowed Domains:', allowedDomains);
    const submittedDomain = new URL(url).hostname.replace(/^www\./, '');
    const isAllowed = allowedDomains.some((domain) => submittedDomain.endsWith(domain));

    if (!isAllowed) {
      const messageBody = `
      🚫 NewzComp - Unsupported Domain Attempt

      A user attempted to analyze an article from an unsupported domain.

      🕒 ${new Date().toLocaleString()}
      🌐 IP: ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}
      📱 UA: ${req.headers['user-agent'] || 'Unknown'}
      📦 Payload: ${JSON.stringify(req.body, null, 2).slice(0, 400)}
      ❌ Requested Domain: ${submittedDomain}
      ❌ Requested URL: ${url}
      `.trim();

      htmlText = `
        <h1>NewzComp - Unsupported Domain Attempt</h1>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP:</strong> ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}</p>
        <p><strong>User Agent:</strong> ${req.headers['user-agent'] || 'Unknown'}</p>
        <p><strong>Payload:</strong> ${JSON.stringify(req.body, null, 2).slice(0, 400)}</p>
        <p><strong>Requested Domain:</strong> ${submittedDomain}</p>
        <p><strong>Requested URL:</strong> ${url}</p>
      `;

      await utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob Unsupported Domain Attempt 🚫', messageBody, htmlText);

      return res.status(403).json({ error: `Domain not allowed for analysis: ${submittedDomain}` });
    }

    const keyword = await utils.extractKeywords(url);
    const relatedArticles = await utils.fetchRelatedArticles(keyword, url, allowedDomains);
    console.log('Related Articles:', relatedArticles);
    if (!relatedArticles.length) {
      return res.status(404).json({ error: 'No related articles found' });
    }
    const scrapedArticles = await utils.scrapeArticles(relatedArticles);
    console.log('Scraped Articles:', scrapedArticles);
    if (!scrapedArticles.length) {
      return res.status(404).json({ error: 'No articles scraped' });
    }
    const analysis = await utils.analyzeArticlesWithAINew(scrapedArticles);
    // Extract article info for metadata
    const { title, description, imageUrl, author } = await utils.getArticleInfo(url);

    let cleanedAnalysis = analysis;
    if (typeof analysis === 'string') {
      cleanedAnalysis = parseAnalysisSection(analysis);
    }
    if (!cleanedAnalysis || typeof cleanedAnalysis !== 'object') {
      cleanedAnalysis = { error: 'Failed to parse analysis' };
    }
    // Use analysis fields for DB and response
    const analysisTitle = cleanedAnalysis.title || title || '';
    const analysisTopic = cleanedAnalysis.topic || 'all';
    const analysisSummary = cleanedAnalysis.summary || description || '';
    const analysisRelated = cleanedAnalysis.related_articles || scrapedArticles.map((article) => ({
      source: article.source,
      title: article.title,
      url: article.url,
      content: article.text,
    }));
    res.json({
      analysis: cleanedAnalysis,
      title: analysisTitle,
      topic: analysisTopic,
      summary: analysisSummary,
      image_url: imageUrl || '',
      author: author || '',
      related_articles: analysisRelated,
    });

    // Save to DB
    const source_url = url;
    const source_name = scrapedArticles[0].source;
    const analysisData = {
      analysis: cleanedAnalysis,
      title: analysisTitle,
      topic: analysisTopic,
      summary: analysisSummary,
      image_url: imageUrl || '',
      author: author || '',
      related_articles: analysisRelated,
    };
    console.log('Saving to DB:', { title: analysisTitle, topic: analysisTopic, analysisData, source_url });
    try {
      await asyncFunction(
        analysisTitle,
        analysisData,
        source_name,
        source_url,
        analysisTopic,
        analysisSummary,
        imageUrl || '',
        author || '',
        analysisRelated
      );
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

      📊 Bob's Analysis: ${analysis}
    `.trim();

    htmlText = `
      <h1>NewzComp Analysis Request</h1>
      <p><strong>Endpoint:</strong> /analyze</p>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>IP:</strong> ${requestIP}</p>
      <p><strong>User Agent:</strong> ${userAgent}</p>
      <p><strong>Payload:</strong> ${cleanedBody}</p>
      <p><strong>Response Status:</strong> ${responseStatus}</p>
      <p><strong>Response Time:</strong> ${responseTime}</p>
      <p><strong>Generated Search Query:</strong> ${keyword}</p>
      <p><strong>Bob's Analysis:</strong> ${analysis}</p>
    `;

    await utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob API Notification ✔', messageBody, htmlText);
  } catch (error) {
    console.error('Error in /analyze endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== FEEDBACK ENDPOINT =====

app.post('/feedback', async (req, res) => {
  const { name, email, message } = req.body;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const requestIP = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown';

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const messageBody = `
    📝 NewzComp Feedback

    🕒 ${new Date().toLocaleString()}
    🌐 IP: ${req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'Unknown'}
    📱 UA: ${req.headers['user-agent'] || 'Unknown'}

    👤 Name: ${name}
    📧 Email: ${email}
    💬 Message: ${message}
  `.trim();

  const htmlText = `
    <h1>NewzComp Feedback</h1>
    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>IP:</strong> ${requestIP}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong> ${message}</p>
  `;

  await utils.sendEmail(process.env.EMAIL_USER, process.env.EMAIL_TO, 'NewzComp - Bob Feedback Notification ✔', messageBody, htmlText);

  res.json({ success: true, message: 'Feedback submitted successfully.' });
});

// ===== LATEST BREAKING NEWS ENDPOINT =====
const { parseStringPromise } = require('xml2js');

// ===== LATEST BREAKING NEWS ENDPOINT (Refactored for theme & Google Search) =====
app.get('/latest', async (req, res) => {
  try {
    let theme = req.query.theme;
    if (!theme) {
      return res.status(400).json({ error: 'Missing required theme parameter' });
    }
    theme = theme.toLowerCase(); // Ensure theme is lowercase
    // Query the DB for articles with this theme (topic)
    const conn = await require('mariadb').createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    let articles;
    if (theme === 'all') {
      // Return all articles regardless of theme
      articles = await conn.query(
        'SELECT * FROM daily_news_articles ORDER BY news_date DESC, id DESC'
      );
    } else {
      // Return articles for specific theme
      articles = await conn.query(
        'SELECT * FROM daily_news_articles WHERE LOWER(theme) = ? ORDER BY news_date DESC, id DESC',
        [theme]
      );
    }

    await conn.end();
    if (!articles.length) {
      return res.status(404).json({ error: `No articles found for theme: ${theme}` });
    }
    return res.json({
      articles
    });
  } catch (error) {
    console.error('Error in /latest endpoint:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get metadata for all articles
app.get('/articles', async (req, res) => {
  try {
    let articles = await getHistoricArticleMetadata(); // Fetch all articles metadata from the database
    articles = articles.map((article) => ({
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
    // Parse analysis JSON
    let parsedAnalysis = {};
    try {
      parsedAnalysis = typeof article.analysis === 'string' ? JSON.parse(article.analysis) : article.analysis;
      // Handle nested analysis if it exists
      if (parsedAnalysis.analysis && typeof parsedAnalysis.analysis === 'object') {
        parsedAnalysis = parsedAnalysis.analysis;
      }
    } catch (e) {
      parsedAnalysis = {};
    }

    // Parse related_articles if it's a string
    let relatedArticles = [];
    try {
      if (article.related_articles) {
        relatedArticles = typeof article.related_articles === 'string' ? JSON.parse(article.related_articles) : article.related_articles;
      }
    } catch (e) {
      relatedArticles = [];
    }

    res.json({
      bobid: article.bobid,
      title: article.title || '',
      topic: article.topic || '',
      author: article.author || '',
      image_url: article.image_url || '',
      related_articles: relatedArticles,
      query_date: article.query_date,
      source_name: article.source_name || '',
      source_url: article.source_url || '',
      keyword: article.keyword || '',
      analysis: {
        summary: parsedAnalysis.summary || '',
        bias: parsedAnalysis.bias || [],
        bias_rating: parsedAnalysis.bias_rating || '',
        bias_direction: parsedAnalysis.bias_direction || '',
        sources_agree_on: parsedAnalysis.sources_agree_on || '',
        conclusion: parsedAnalysis.conclusion || '',
        recommendations: parsedAnalysis.recommendations || '',
        reasoning: parsedAnalysis.reasoning || ''
      }
    });
  } catch (error) {
    console.error(`Error fetching article with ID ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
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
