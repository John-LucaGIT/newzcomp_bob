const axios = require('axios');
const { JSDOM } = require('jsdom');
require('dotenv').config();
const API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.GOOGLE_CX;

async function searchNews(query) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error("Google API Error:", data.error);
    return [];
  }

  if (!data.items) {
    console.warn("No search results found.");
    return [];
  }

  return data.items; // Array of search results
}

function generateNewsQuery(theme = 'All') {
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

  // Get today's date and the date 2 days ago
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  // Format dates as YYYY-MM-DD
  const formatDate = d => d.toISOString().split('T')[0];
  const dateRange = `after:${formatDate(twoDaysAgo)} before:${formatDate(today)}`;

  // Compose query
  const themeQuery = themes[theme] || '';
  const query = [themeQuery, 'news', dateRange].filter(Boolean).join(' ');

  return query;
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

getNewsArticles = async (theme) => {
  const query = generateNewsQuery(theme);
  console.log("Generated Query:", query);
  const results = await searchNews(query);
  return results;
}

module.exports = {
  searchNews,
  generateNewsQuery,
  getNewsArticles,
  findFirstArticleLink,
  findAllArticleLinks
};