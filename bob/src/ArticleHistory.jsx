import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Helmet } from 'react-helmet';

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
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('http://0.0.0.0:3001/articles');
        if (!response.ok) throw new Error('Failed to fetch article metadata');
        const data = await response.json();
        setArticles(data);
      } catch (error) {
        console.error('Error loading article metadata:', error.message);
      }
    }

    fetchMetadata();
  }, []);

  function cleanMarkdown(markdown) {
    return markdown?.replace(/^```markdown\s*/, '').replace(/```$/, '') || '';
  }

  const handleArticleClick = async (bobid) => {
    setLoading(true);
    try {
      const response = await fetch(`http://0.0.0.0:3001/articles/${bobid}`);
      if (!response.ok) throw new Error('Failed to fetch article');
      const data = await response.json();
      setSelectedArticle(data.analysis);
      setRelatedArticles(data.analysis.related_articles);
      setMarkdownContent(cleanMarkdown(data.analysis.analysis));
    } catch (error) {
      console.error(`Error loading article ${bobid}:`, error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-6 py-12 mt-20 md:mt-0">
      <Metadata />
      <Helmet>
        <title>Bob - AI News Commentary Historic Searches</title>
      </Helmet>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-6 py-12 mt-2 md:mt-0 custom-flex-nc">
        {/* Article History */}
          {
          <div className="text-center mb-5">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Past Searches</h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">See what other users have searched for and analyzed with Bob. Click on any article card below to view its AI-generated summary, bias analysis, and related news coverage.</p>
          </div>
        }
        {selectedArticle && (
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full p-12 mb-12">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold">{selectedArticle.title}</h2>
                <div className="mb-2 text-sm text-gray-500">{selectedArticle.source_name}</div>
                <div className="mb-6 text-gray-600">{selectedArticle.description}</div>
              </div>
              <button className="text-gray-500 hover:text-red-500 text-3xl" onClick={() => setSelectedArticle(null)} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="prose prose-xl max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-3xl font-semibold mt-6 mb-3" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-4 text-gray-700" {...props} />,
                  li: ({ node, ...props }) => <li className="ml-6 list-disc" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
            <a href={selectedArticle.source_url} target="_blank" rel="noopener noreferrer" className="block mt-8 text-blue-600 hover:underline">
              View Original Article
            </a>

            <h2 className="text-4xl font-semibold mt-16 mb-8 text-gray-800">Related Articles</h2>

            <div className="space-y-10">
              {Array.isArray(relatedArticles) &&
                relatedArticles.map((article, idx) => (
                  <div key={idx} className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="text-sm text-gray-500 mb-2">{article.source}</div>
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-semibold text-blue-600 hover:underline">
                      {article.title}
                    </a>
                    <p className="text-gray-700 mt-6 whitespace-pre-wrap">{article.content}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
        {/* Article List */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.length === 0 && <div className="col-span-full text-gray-500 text-lg text-center">No stored articles found.</div>}
          {articles.map((article) => {
            const formattedDate = new Date(article.query_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            return (
              <div key={article.bobid} className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition" onClick={() => handleArticleClick(article.bobid)}>
                <div className="text-sm text-gray-500 mb-1">{article.source_name}</div>
                <div className="text-xl font-semibold text-blue-700 mb-2">{article.title}</div>
                <div className="text-gray-700 mb-2">{formattedDate}</div>
                <div className="text-xs text-gray-400 truncate">{article.source_url}</div>
              </div>
            );
          })}
        </div>
        {/* Optional loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="text-white text-xl">Loading article...</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArticleHistory;
