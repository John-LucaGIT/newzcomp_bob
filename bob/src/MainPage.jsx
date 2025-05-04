import React, { useState, useEffect, useRef } from 'react';
import { Link, Meta } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Helmet } from 'react-helmet';
import '@fortawesome/fontawesome-free/css/all.min.css';

function Metadata() {
  return (
    <Helmet>
      <title>Bob - AI News Commentary by NewzComp</title>
      <meta name="description" content="Meet Bob, your AI-powered news assistant by NewzComp. Analyze news articles for bias, get summaries, and explore related coverage. Visit newzcomp.com for more." />
      <meta name="keywords" content="AI news analysis, news bias detection, article summaries, related news, NewzComp, Bob AI" />
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

function MainPage() {
  const [url, setUrl] = useState('');
  const responseSectionRef = useRef(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  function cleanMarkdown(markdown) {
    return markdown.replace(/^```markdown\s*/, '').replace(/```$/, '');
  }

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  useEffect(() => {
    const lastUsedUrl = sessionStorage.getItem('lastUsedUrl');
    if (lastUsedUrl) {
      const cachedResponse = sessionStorage.getItem(lastUsedUrl);
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        setUrl(lastUsedUrl);
        setMarkdownContent(cleanMarkdown(data.analysis));
        setRelatedArticles(data.related_articles);
        setAnalyzed(true);
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!url) return alert('Please enter an article URL!');
    setLoading(true);
    try {
        const response = await fetch('http://0.0.0.0:3001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        const cleanedMarkdown = cleanMarkdown(data.analysis);
        sessionStorage.setItem(url, JSON.stringify(data));
        sessionStorage.setItem('lastUsedUrl', url);
        setMarkdownContent(cleanedMarkdown);
        setRelatedArticles(data.related_articles);
        setAnalyzed(true);

        setTimeout(() => {
          responseSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        alert('Failed to analyze article');
      }
    } catch (error) {
      alert('An error occurred while analyzing the article', error.message);
    }
    setLoading(false);
    const audio = new Audio('/assets/success-sound.mp3');
    audio.play();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-6 py-12 mt-20 md:mt-0">
      <Metadata />
      <Helmet>
        <title>Bob - AI News Commentary by NewzComp</title>
        <meta name="description" content="Meet Bob, your AI-powered news assistant..." />
      </Helmet>
      {/* Example: */}
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-6 py-12 mt-2 md:mt-0">
        {/* Main Content */}
        {
          <div className="text-center mb-5">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Meet Bob</h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">Bob analyzes news articles for bias, summarizes the story, and finds related coverage. Enter a URL below!</p>
          </div>
        }
        <div className="w-full max-w-2xl flex flex-col items-center space-y-4">
          <input type="text" placeholder="Paste article URL here..." value={url} onChange={handleUrlChange} className="w-full p-4 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white shadow-md" />

          <div className="flex items-center space-x-2">
            <button onClick={handleAnalyze} disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-lg rounded-xl transition shadow-md">
              {loading ? 'Analyzing...' : 'Analyze with Bob'}
            </button>

            {sessionStorage.getItem('lastUsedUrl') && (
              <button
                onClick={() => {
                  sessionStorage.removeItem('lastUsedUrl');
                  sessionStorage.removeItem(url);
                  setUrl('');
                  setMarkdownContent('');
                  setRelatedArticles([]);
                  setAnalyzed(false);
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white text-lg rounded-xl transition shadow-md"
              >
                Clear Last Response
              </button>
            )}
          </div>
        </div>
        <div className="mt-12 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <i className="fas fa-balance-scale text-5xl text-blue-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800">Bias Rating</h3>
            <p className="text-gray-600">Bob rates articles on a scale of 0 to 5, where 0 means no bias and 5 indicates heavy bias.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <i className="fas fa-compass text-5xl text-green-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800">Bias Direction</h3>
            <p className="text-gray-600">Bob identifies the bias direction as Left, Right, or Neutral based on the article's content.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <i className="fas fa-file-alt text-5xl text-yellow-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800">Article Summary</h3>
            <p className="text-gray-600">Bob provides a concise summary of the article, highlighting key points and themes.</p>
          </div>
        </div>
        <div className="mt-12 w-full max-w-5xl text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">How It Works</h2>
          <p className="text-gray-600 text-lg">Bob searches for similar news articles using the Google Search API and compares the stories. In some cases, Bob may not find any related articles or may find articles that report on slightly different stories.</p>
        </div>
        {loading && (
          <div className="flex items-center justify-center w-full h-full absolute top-0 left-0 bg-gray-100">
            <div className="text-center">
              <ClipLoader size={50} color="#3B82F6" />
              <p className="mt-4 text-gray-500">Bob is analyzing the article...</p>
            </div>
          </div>
        )}
        {analyzed && (
          <div ref={responseSectionRef} className="mt-16 w-full max-w-5xl">
            <div className="prose prose-lg max-w-none bg-white p-10 rounded-2xl shadow-xl overflow-x-auto break-words">
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

            <h2 className="text-3xl font-semibold mt-12 mb-6 text-gray-800">Related Articles</h2>

            <div className="space-y-8">
              {Array.isArray(relatedArticles) &&
                relatedArticles.map((article, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="text-sm text-gray-500 mb-1">{article.source}</div>
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-2xl font-semibold text-blue-600 hover:underline">
                      {article.title}
                    </a>
                    <p className="text-gray-700 mt-4 whitespace-pre-wrap">{article.content}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPage;
