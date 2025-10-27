const axios = require('axios');
const { JSDOM } = require('jsdom');
const { google } = require('googleapis');
require('dotenv').config();

// Service Account Authentication
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './newzcomp-bob-a3812d1ce054.json',
  scopes: ['https://www.googleapis.com/auth/cse']
});

// Create Custom Search client
const customsearch = google.customsearch('v1');
const CX = process.env.GOOGLE_CX;

// Import AI utilities
const { findRelevantArticleWithAI } = require('./ai_utils.js');

async function searchNews(params) {
  try {
    console.log("Generated params:", params);

    // Try service account authentication first
    try {
      const authClient = await auth.getClient();

      const response = await customsearch.cse.list({
        auth: authClient,
        cx: CX,
        q: params.q,
        sort: params.sort,
        dateRestrict: params.dateRestrict,
        num: 10
      });

      const data = response.data;
      console.log("✅ Service account authentication successful");

      if (!data.items || data.items.length === 0) {
        console.warn("No search results found for the given parameters.");
        return [];
      }

      console.log(`Found ${data.items.length} search results`);
      const processedResults = await processSearchResults(data.items, params.q);
      return processedResults;

    } catch (serviceAccountError) {
      console.warn("Service account failed, trying API key fallback:", serviceAccountError.message);

      // Fallback to API key method
      const API_KEY = process.env.GOOGLE_API_KEY;
      if (!API_KEY) {
        throw new Error("No API key available for fallback");
      }

      const baseUrl = 'https://www.googleapis.com/customsearch/v1';
      const searchParams = new URLSearchParams(params);
      searchParams.append('key', API_KEY);
      searchParams.append('cx', CX);

      const url = `${baseUrl}?${searchParams.toString()}`;
      console.log("Making API call with API key to URL:", url);

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error("Google API Error:", data.error?.message || data);
        return [];
      }

      if (!data.items || data.items.length === 0) {
        console.warn("No search results found for the given parameters.");
        return [];
      }

      console.log("✅ API key authentication successful");
      console.log(`Found ${data.items.length} search results`);
      const processedResults = await processSearchResults(data.items, params.q);
      return processedResults;
    }

  } catch (error) {
    console.error("Failed to fetch from Google API:", error.message);
    return [];
  }
}

/**
 * Detects if a URL is a section/category page rather than a specific article
 */
function isGeneralSectionPage(url) {
  const sectionPatterns = [
    /\/news\/[^\/]*\/?$/,           // /news/politics, /news/business/
    /\/topics\/[^\/]*\/?$/,         // /topics/china-russia-relations
    /\/category\/[^\/]*\/?$/,       // /category/politics
    /\/section\/[^\/]*\/?$/,        // /section/world
    /\/[^\/]*\/diplomacy\/?$/,      // /news/us/diplomacy
    /\/[^\/]*\/politics\/?$/,       // /news/politics
    /\/[^\/]*\/business\/?$/,       // /news/business
    /\/tag\/[^\/]*\/?$/,           // /tag/trump
    /\/latest\/?$/,                // /latest
    /\/breaking\/?$/,              // /breaking
    /\/home\/?$/,                  // /home
    /\/$/ // Root domain endings
  ];

  return sectionPatterns.some(pattern => pattern.test(url));
}

/**
 * Uses AI to find the most relevant specific article from a section page
 */
async function findRelevantArticleFromSection(sectionUrl, searchQuery) {
  try {
    console.log(`Finding relevant article from section: ${sectionUrl}`);

    // Get the page content
    const { data: html } = await axios.get(sectionUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });

    const dom = new JSDOM(html, { url: sectionUrl });
    const document = dom.window.document;

    // Extract all potential article links with their context
    // Extract all potential article links with their context, removing duplicates
    const seenLinks = new Set();
    const linkCandidates = Array.from(document.querySelectorAll('a'))
      .map(link => {
      const href = link.href;
      const text = link.textContent?.trim() || '';
      const parent = link.parentElement;
      const context = parent?.textContent?.trim()?.substring(0, 200) || '';

      return { href, text, context };
      })
      .filter(item =>
      item.href &&
      item.href.startsWith('http') &&
      item.href !== sectionUrl &&
      !item.href.includes('#') &&
      !/\.(jpg|jpeg|png|gif|svg|pdf)$/i.test(item.href) &&
      !isGeneralSectionPage(item.href) && // Exclude other section pages
      item.text.length > 10 // Meaningful link text
      )
      .filter(item => {
      if (seenLinks.has(item.href)) return false;
      seenLinks.add(item.href);
      return true;
      })
      .slice(0, 80); // Limit to top 80 candidates

    if (linkCandidates.length === 0) {
      console.warn(`No article candidates found on ${sectionUrl}`);
      return null;
    }

    // Use AI to select the most relevant article
    const selectedUrl = await findRelevantArticleWithAI(linkCandidates, searchQuery);

    if (selectedUrl) {
      console.log(`AI selected article: ${selectedUrl}`);
    } else {
      console.warn(`AI found no relevant articles for query: ${searchQuery}`);
    }

    return selectedUrl;
  } catch (error) {
    console.error(`Error finding relevant article from ${sectionUrl}:`, error.message);
    return null;
  }
}

/**
 * Processes search results to diversify sources and convert section pages to articles
 */
async function processSearchResults(items, searchQuery) {
  console.log("Processing search results for source diversity and specific articles...");

  const seenDomains = new Set();
  const processedResults = [];
  console.log('Search result items:', items);

  for (const item of items) {
    try {
      // Extract domain
      const domain = new URL(item.link).hostname.replace(/^www\./, '');

      // Skip if we already have an article from this domain
      if (seenDomains.has(domain)) {
        console.log(`Skipping duplicate domain: ${domain}`);
        continue;
      }

      let finalUrl = item.link;
      let finalTitle = item.title;

      // Check if this is a section page
      if (isGeneralSectionPage(item.link)) {
        console.log(`Detected section page: ${item.link}`);
        const specificArticle = await findRelevantArticleFromSection(item.link, searchQuery);

        if (specificArticle) {
          finalUrl = specificArticle;
          // Try to get a better title for the specific article
          try {
            const { data: articleHtml } = await axios.get(specificArticle, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 5000
            });
            const articleDom = new JSDOM(articleHtml);
            const articleTitle =
              articleDom.window.document.querySelector('meta[property="og:title"]')?.content ||
              articleDom.window.document.querySelector('title')?.textContent ||
              finalTitle;
            finalTitle = articleTitle;
          } catch (e) {
            console.warn(`Could not extract title from specific article: ${e.message}`);
          }
        } else {
          console.warn(`Could not find specific article for section: ${item.link}`);
          continue; // Skip this result if we can't find a specific article
        }
      }

      // Add to results and mark domain as seen
      seenDomains.add(domain);
      processedResults.push({
        ...item,
        link: finalUrl,
        title: finalTitle,
        displayLink: domain
      });

      console.log(`Added article from ${domain}: ${finalTitle}`);

      // Limit to reasonable number of diverse sources
      if (processedResults.length >= 8) {
        break;
      }

    } catch (error) {
      console.error(`Error processing search result ${item.link}:`, error.message);
      continue;
    }
  }

  console.log(`Processed ${items.length} results into ${processedResults.length} diverse articles`);
  return processedResults;
}

function buildSearchParameters(concepts, originalArticleUrl) {
  const originalDomain = new URL(originalArticleUrl).hostname;

  const quotedEntities = concepts.entities.map(e => `"${e}"`);
  let coreQuery = [...quotedEntities, concepts.topic].join(' ');

  if (concepts.keywords && concepts.keywords.length > 0) {
    const keywordPart = concepts.keywords.map(k => `"${k}"`).join(' OR ');
    coreQuery += ` (${keywordPart})`;
  }

  const params = {
    q: coreQuery,
    dateRestrict: 'd7',
    sort: 'date',
    // 5. Exclude the original source's domain.
    // NOTE: The Custom Search API uses `siteSearch` but it can be tricky.
    // A better way is to add `-site:domain.com` directly to the q parameter.
    q: `${coreQuery} -site:${originalDomain}`
  };

  return params;
}

/**
 * Generates a structured parameters object for a themed news search.
 * This object is ready to be used by the searchNews function.
 *
 * @param {string} [theme='All'] - The news theme (e.g., 'Sports', 'Tech', 'All').
 * @returns {object} A parameters object with 'q' and 'sort' properties.
 */
function generateNewsParams(theme = 'All') {
  const themes = {
    All: 'latest news OR breaking news OR current events',
    Sports: 'sports OR athletics OR games',
    Entertainment: 'entertainment OR movies OR music OR celebrities',
    Science: 'science OR research OR discoveries',
    Environment: 'environment OR climate change OR ecology',
    Education: 'education OR schools OR universities',
    Politics: 'politics',
    Tech: 'technology OR tech',
    Business: 'business',
    Health: 'health',
    World: 'world news OR international',
    Breaking: 'breaking news OR latest news OR urgent updates'
  };

  const today = new Date();
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(today.getDate() - 2);

  // Format dates as YYYY-MM-DD
  const formatDate = d => d.toISOString().split('T')[0];
  const dateRange = `after:${formatDate(twoDaysAgo)} before:${formatDate(today)}`;

  // Compose query string
  const themeQuery = themes[theme] || themes['All'];
  const queryString = `${themeQuery} ${dateRange}`;

  const params = {
    q: queryString,
    sort: 'date'
  };

  return params;
}
async function findFirstArticleLink(sectionUrl) {
  try {
    const { data: html } = await axios.get(sectionUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const dom = new JSDOM(html, { url: sectionUrl });
    const document = dom.window.document;

    // Get all <a> tags with hrefs
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href =>
        href &&
        href.startsWith('http') &&
        href !== sectionUrl &&
        !href.endsWith('/') && // avoid home/section pages
        !href.includes('#') && // skip anchor links
        !/\.(jpg|jpeg|png|gif|svg|pdf)$/i.test(href) // skip images/docs
      );

    // Prefer links that look like articles (date or slug in path)
    const articleLike = links.find(href =>
      /\/\d{4}\/\d{2}\/\d{2}\//.test(href) || // date in path
      /\/news\//i.test(href) || // contains /news/
      /\/[a-z-]+-\d{7,}/i.test(href) // slug with id
    );

    // Fallback: just return the first valid link if nothing matches above
    return articleLike || links[0] || null;
  } catch (err) {
    // console.error('Error finding article link:', err.message);
    return null;
  }
}

async function findAllArticleLinks(sectionUrl) {
  try {
    const { data: html } = await axios.get(sectionUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const dom = new JSDOM(html, { url: sectionUrl });
    const document = dom.window.document;

    // Get all <a> tags with hrefs
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href =>
        href &&
        href.startsWith('http') &&
        href !== sectionUrl &&
        !href.endsWith('/') && // avoid home/section pages
        !href.includes('#') && // skip anchor links
        !/\.(jpg|jpeg|png|gif|svg|pdf)$/i.test(href) // skip images/docs
      );

    // Filter links that look like articles (date or slug in path)
    const articleLinks = links.filter(href =>
      /\/\d{4}\/\d{2}\/\d{2}\//.test(href) || // date in path
      /\/news\//i.test(href) || // contains /news/
      /\/[a-z-]+-\d{7,}/i.test(href) // slug with id
    );

    // Remove duplicates
    const uniqueLinks = [...new Set(articleLinks)];
    // console.log('Found article links:', uniqueLinks);
    return uniqueLinks;
  } catch (err) {
    console.error('Error finding article links:', err.message);
    return [];
  }
}

const getNewsArticles = async (theme) => {
  const params = generateNewsParams(theme);
  console.log("Generated params:", params);
  const results = await searchNews(params);
  return results;
}

module.exports = {
  searchNews,
  buildSearchParameters,
  generateNewsParams,
  getNewsArticles,
  findFirstArticleLink,
  findAllArticleLinks
};