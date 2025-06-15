import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

function Metadata() {
  return (
    <Helmet>
      <title>Bob - AI News Commentary Historic Searches</title>
      <meta name="description" content="Explore previous AI news analysis searches. You will find other users news searches and can read Bob's news analysis which includes a bias analysis for articles from the left, right and center." />
      <meta name="keywords" content="AI news analysis, news bias detection, article summaries, related news, NewzComp, Bob AI, ai news analysis, news analysis, bias detection, news comparison, democrats, republicans, poltiical news analysis, politics, news" />
      <meta name="author" content="NewzComp" />
      <meta property="og:title" content="Bob - AI News Commentary by NewzComp" />
      <meta property="og:description" content="Discover Bob, the AI-powered tool by NewzComp that analyzes news articles for bias, provides summaries, and finds related stories. Visit newzcomp.com for more." />
      <meta property="og:url" content="https://newzcomp.com" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/assets/tricolorblack.svg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Bob - AI News Commentary by NewzComp" />
      <meta name="twitter:description" content="Analyze news articles for bias, summaries, and related coverage with Bob, powered by NewzComp. Visit newzcomp.com for more." />
      <meta name="twitter:image" content="/assets/tricolorblack.svg" />
    </Helmet>
  );
}

function ArticleHistory() {
  const [articles, setArticles] = useState([]);
  const API_BASE = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch(`${API_BASE}/articles`);

        if (!response.ok) throw new Error('Failed to fetch article metadata');
        const data = await response.json();
        setArticles(data);
      } catch (error) {
        console.error('Error loading article metadata:', error.message);
      }
    }

    fetchMetadata();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-3 py-12 mt-5 md:mt-0">
      <Metadata />
      <Helmet>
        <title>Bob - AI News Commentary Historic Searches</title>
      </Helmet>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-0 py-12 mt-2 md:mt-0 custom-flex-nc">
        {/* Article History */}
        {
          <div className="text-center mb-5">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Past Searches</h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">See what other users have searched for and analyzed with Bob. Click on any article card below to view its AI-generated summary, bias analysis, and related news coverage.</p>
          </div>
        }

        {/* Article List */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.length === 0 && <div className="col-span-full text-gray-500 text-lg text-center">No stored articles found.</div>}
          {[...articles].reverse().map((article) => {
            const formattedDate = new Date(article.query_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            return (
              <Link key={article.bobid} to={`/article/${article.bobid}`} className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition block" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="text-sm text-gray-500 mb-1">{article.source_name}</div>
                <div className="text-xl font-semibold text-blue-700 mb-2">{article.title}</div>
                <div className="text-gray-700 mb-2">{formattedDate}</div>
                <div className="text-xs text-gray-400 truncate">{article.source_url}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ArticleHistory;
