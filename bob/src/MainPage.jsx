import React, { useState, useEffect, useRef } from 'react';
import { Link, Meta } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import { Helmet } from 'react-helmet';
import '@fortawesome/fontawesome-free/css/all.min.css';

function getBiasColor(biasDirection) {
  switch (biasDirection?.toLowerCase()) {
    case 'left':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'right':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'center':
    case 'neutral':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getBiasRatingColor(rating) {
  // Handle numeric ratings (0-5 scale)
  if (typeof rating === 'number' || !isNaN(parseFloat(rating))) {
    const numRating = parseFloat(rating);
    if (numRating <= 1.5) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (numRating <= 3.5) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    } else {
      return 'bg-red-50 text-red-700 border-red-200';
    }
  }

  // Handle string ratings
  switch (rating?.toLowerCase()) {
    case 'low':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'high':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function Metadata() {
  return (
    <Helmet>
      <title>Bob - AI News Commentary by NewzComp</title>
      <meta name="description" content="Meet Bob, your AI-powered news assistant by NewzComp. Analyze news articles for bias, get summaries, and explore related coverage. Visit newzcomp.com for more." />
      <meta name="keywords" content="AI news analysis, news bias detection, article summaries, related news, NewzComp, Bob AI, News Comparison, AI NEWS COMPARISON" />
      <meta name="author" content="NewzComp" />
      <meta property="og:title" content="Bob - AI News Commentary by NewzComp" />
      <meta property="og:description" content="Discover Bob, the AI-powered tool by NewzComp that analyzes news articles for bias, provides summaries, and finds related stories. NewzComp's AI News Comparison Service. Visit newzcomp.com for more." />
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
  const [analysisData, setAnalysisData] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE;

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setErrorMsg('');
  };

  useEffect(() => {
    const lastUsedUrl = sessionStorage.getItem('lastUsedUrl');
    if (lastUsedUrl) {
      const cachedResponse = sessionStorage.getItem(lastUsedUrl);
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        setUrl(lastUsedUrl);
        setAnalysisData(data);
        setRelatedArticles(data.related_articles);
        setAnalyzed(true);
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!url) return alert('Please enter an article URL!');
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem(url, JSON.stringify(data));
        sessionStorage.setItem('lastUsedUrl', url);
        setAnalysisData(data);
        setRelatedArticles(data.related_articles);
        setAnalyzed(true);

        setTimeout(() => {
          responseSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
       let errorMsg = 'Failed to analyze article';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {
          errorMsg = await response.text();
        }
        setErrorMsg(errorMsg);
      }
    } catch (error) {
      alert('An error occurred while analyzing the article', error.message);
      setErrorMsg(error.message);
    }
    setLoading(false);
    const audio = new Audio('/assets/success-sound.mp3');
    audio.play();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-6 py-12 mt-5 md:mt-0">
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
          {/* Error message display */}
          {errorMsg && (
            <div className="w-full mb-2 text-red-600 bg-red-100 border border-red-300 rounded-lg px-4 py-2 text-center">
              {errorMsg}
            </div>
          )}
          {/* URL input and analyze button */}
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
                  setAnalysisData(null);
                  setRelatedArticles([]);
                  setAnalyzed(false);
                  setErrorMsg('');
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
        {analyzed && analysisData && (
          <div ref={responseSectionRef} className="mt-16 w-full max-w-6xl">
            <div className="bg-white rounded-2xl shadow-2xl w-full p-6 sm:p-8 md:p-10 mb-6">
              {/* Article Header */}
              <div className="mb-8">
                {analysisData.image_url && (
                  <img
                    src={analysisData.image_url}
                    alt={analysisData.title}
                    className="w-full h-64 object-cover rounded-xl mb-6"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {analysisData.topic && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {analysisData.topic}
                    </span>
                  )}
                  {analysisData.source_name && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {analysisData.source_name}
                    </span>
                  )}
                  {analysisData.author && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      By {analysisData.author}
                    </span>
                  )}
                </div>

                <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">{analysisData.title}</h2>
              </div>

              {/* Smart Summary Box - Purple */}
              {analysisData.analysis?.summary && (
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-xl p-6 mb-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-500 text-white rounded-full p-2 mr-3">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.051V8a1 1 0 01-2 0V6a1 1 0 01.504-.864l3-1.716a1 1 0 011.114.084zM14.382 4.504a1 1 0 011.114-.084l3 1.716A1 1 0 0119 6v2a1 1 0 11-2 0V7.051l-1.254.717a1 1 0 11-.992-1.736L15.016 6l-.23-.132a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-purple-800">Smart Summary</h3>
                  </div>
                  <div className="prose max-w-none">
                    <div className="text-purple-700">
                      {analysisData.analysis.summary}
                    </div>
                  </div>
                </div>
              )}

              {/* Bias Analysis Boxes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Bias Direction Box */}
                {analysisData.analysis?.bias_direction && (
                  <div className={`rounded-xl p-6 border-2 ${getBiasColor(analysisData.analysis.bias_direction)}`}>
                    <h3 className="text-lg font-bold mb-3">Bias Direction</h3>
                    <div className="text-2xl font-bold capitalize mb-2">
                      {analysisData.analysis.bias_direction}
                    </div>
                    {analysisData.analysis.reasoning && (
                      <p className="text-sm opacity-80">
                        {analysisData.analysis.reasoning}
                      </p>
                    )}
                  </div>
                )}

                {/* Bias Rating Box */}
                {analysisData.analysis?.bias_rating && (
                  <div className={`rounded-xl p-6 border-2 ${getBiasRatingColor(analysisData.analysis.bias_rating)}`}>
                    <h3 className="text-lg font-bold mb-3">Bias Intensity</h3>
                    <div className="text-2xl font-bold capitalize mb-2">
                      {typeof analysisData.analysis.bias_rating === 'number' || !isNaN(parseFloat(analysisData.analysis.bias_rating))
                        ? `${parseFloat(analysisData.analysis.bias_rating).toFixed(1)}/5.0`
                        : analysisData.analysis.bias_rating}
                    </div>
                    <div className="text-sm opacity-80">
                      {typeof analysisData.analysis.bias_rating === 'number' || !isNaN(parseFloat(analysisData.analysis.bias_rating))
                        ? 'Bias intensity on a scale of 0-5'
                        : 'Level of bias detected in the article'}
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Article Bias Ratings */}
              {Array.isArray(analysisData.analysis?.bias) && analysisData.analysis.bias.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-4 text-gray-800">Source Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysisData.analysis.bias.map((bias, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="font-semibold text-gray-800 mb-2">{bias.source || `Source ${idx + 1}`}</div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Direction:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getBiasColor(bias.bias_direction)}`}>
                            {bias.bias_direction || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-600">Rating:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getBiasRatingColor(bias.bias_rating)}`}>
                            {typeof bias.bias_rating === 'number' || !isNaN(parseFloat(bias.bias_rating))
                              ? `${parseFloat(bias.bias_rating).toFixed(1)}/5`
                              : bias.bias_rating || 'Unknown'}
                          </span>
                        </div>
                        {bias.bias_analysis && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <h5 className="text-md font-semibold text-gray-700 mb-3">Bias Analysis:</h5>
                            <p className="text-gray-700 leading-relaxed">{bias.bias_analysis}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Analysis Sections */}
              {analysisData.analysis?.sources_agree_on && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Sources Agree On</h3>
                  <div className="prose max-w-none">
                    <div className="text-gray-700">
                      {analysisData.analysis.sources_agree_on}
                    </div>
                  </div>
                </div>
              )}

              {(analysisData.analysis?.conclusion || analysisData.analysis?.recommendations) && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    {analysisData.analysis?.conclusion && analysisData.analysis?.recommendations
                      ? "Conclusion & Recommendations"
                      : analysisData.analysis?.conclusion
                        ? "Conclusion"
                        : "Recommendations"}
                  </h3>
                  <div className="prose max-w-none space-y-4">
                    {analysisData.analysis?.conclusion && (
                      <div>
                        {analysisData.analysis?.recommendations && (
                          <h4 className="text-lg font-semibold text-gray-700 mb-2">Conclusion:</h4>
                        )}
                        <div className="text-gray-700">
                          {analysisData.analysis.conclusion}
                        </div>
                      </div>
                    )}
                    {analysisData.analysis?.recommendations && (
                      <div>
                        {analysisData.analysis?.conclusion && (
                          <h4 className="text-lg font-semibold text-gray-700 mb-2">Recommendations:</h4>
                        )}
                        <div className="text-gray-700">
                          {analysisData.analysis.recommendations}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Reasoning Section */}
              {analysisData.analysis?.reasoning && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">AI Reasoning</h3>
                  <div className="prose max-w-none">
                    <div className="text-gray-700">
                      {analysisData.analysis.reasoning}
                    </div>
                  </div>
                </div>
              )}

              {/* Original Article Link */}
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors font-medium border border-blue-300"
                >
                  View Original Article
                </a>
              )}
            </div>

            <h2 className="text-3xl font-semibold mt-12 mb-6 text-gray-800">Related Articles</h2>

            <div className="space-y-6">
              {Array.isArray(relatedArticles) &&
                relatedArticles.map((article, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
                    <div className="text-sm text-purple-600 font-medium mb-2">{article.source}</div>
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
