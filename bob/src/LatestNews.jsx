import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';

// --- Helper Components & Functions (No Changes Here) ---

function Metadata() {
  return (
    <>
      <title>Latest Breaking News - Bob AI Analysis</title>
      <meta name="description" content="Stay updated with the latest breaking news analyzed by Bob AI. Filter by topic and explore comprehensive bias analysis, summaries, and related coverage." />
      <meta name="keywords" content="latest news, breaking news, AI news analysis, news bias detection, real-time news, NewzComp, Bob AI, politics, business, technology" />
      <meta name="author" content="NewzComp" />
      <meta property="og:title" content="Latest Breaking News - Bob AI Analysis" />
      <meta property="og:description" content="Get the latest breaking news with AI-powered analysis by Bob. Filter by topic and explore bias detection and related coverage." />
      <meta property="og:url" content="https://app.newzcomp.com/latest" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/assets/tricolorblack.svg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Latest Breaking News - Bob AI Analysis" />
      <meta name="twitter:description" content="Stay informed with the latest breaking news analyzed by Bob AI. Filter by topic and explore comprehensive coverage." />
      <meta name="twitter:image" content="/assets/tricolorblack.svg" />
    </>
  );
}

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


// --- Main LatestNews Component (All logic is updated here) ---

function LatestNews() {
  // --- STATE MANAGEMENT ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range state (defaults to last 30 days)
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(() => {
    const saved = localStorage.getItem('latestNewsDateRange');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultDateRange();
      }
    }
    return getDefaultDateRange();
  });

  // Initialize state from localStorage once. After this, state is the single source of truth.
  const [selectedTheme, setSelectedTheme] = useState(
    () => localStorage.getItem('latestNewsTheme') || 'all'
  );

  // Collapsible panel states
  const [isTopicSelectorExpanded, setIsTopicSelectorExpanded] = useState(false);
  const [isDateRangeExpanded, setIsDateRangeExpanded] = useState(false);

  const [cache, setCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('latestNewsCache') || '{}');
    } catch {
      return {};
    }
  });

  const [lastRefresh, setLastRefresh] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('latestNewsRefresh') || '{}');
    } catch {
      return {};
    }
  });

  const API_BASE = import.meta.env.VITE_API_BASE;
  const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes

  const availableThemes = [
    { value: 'all', label: 'All Topics', icon: '🌐' },
    { value: 'politics', label: 'Politics', icon: '🏛️' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'tech', label: 'Technology', icon: '💻' },
    { value: 'health', label: 'Health', icon: '🏥' },
    { value: 'science', label: 'Science', icon: '🔬' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'world', label: 'World News', icon: '🌍' },
    { value: 'environment', label: 'Environment', icon: '🌱' }
  ];

  // --- DATA FETCHING LOGIC ---
  // This primary useEffect handles all data fetching and runs ONLY when the theme changes.
  useEffect(() => {
    const fetchThemeData = async () => {
      setLoading(true);
      setError('');

      const now = Date.now();
      const cacheKey = `${selectedTheme}_${dateRange.start}_${dateRange.end}`;
      const lastRefreshTime = lastRefresh[cacheKey];
      const cachedData = cache[cacheKey];

      // Decision is based on STATE, not direct localStorage reads
      if (cachedData && lastRefreshTime && (now - lastRefreshTime) < CACHE_EXPIRATION) {
        setArticles(cachedData);
        setLoading(false);
        return;
      }

      try {
        // Format dates for API (ISO format with time)
        const startDateTime = `${dateRange.start}T00:00:00Z`;
        const endDateTime = `${dateRange.end}T23:59:59Z`;

        const url = `${API_BASE}/latest?theme=${encodeURIComponent(selectedTheme)}&start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
          throw new Error(errorData.message || `Failed to fetch articles`);
        }

        const data = await response.json();
        const fetchedArticles = data.articles || [];

        setArticles(fetchedArticles);
        setCache(prev => ({ ...prev, [cacheKey]: fetchedArticles }));
        setLastRefresh(prev => ({ ...prev, [cacheKey]: now }));

      } catch (err) {
        setError(err.message);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchThemeData();
  }, [selectedTheme, dateRange, lastRefresh, API_BASE, CACHE_EXPIRATION, cache]); // Re-fetches if theme, date range changes OR if lastRefresh is changed (for manual refresh)


  // --- LOCALSTORAGE PERSISTENCE ---
  // These effects automatically sync our state TO localStorage whenever it changes.
  useEffect(() => {
    localStorage.setItem('latestNewsTheme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    localStorage.setItem('latestNewsCache', JSON.stringify(cache));
  }, [cache]);

  useEffect(() => {
    localStorage.setItem('latestNewsRefresh', JSON.stringify(lastRefresh));
  }, [lastRefresh]);

  useEffect(() => {
    localStorage.setItem('latestNewsDateRange', JSON.stringify(dateRange));
  }, [dateRange]);


  // --- EVENT HANDLERS ---
  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => {
      const newRange = { ...prev, [field]: value };

      // Ensure start date is not after end date
      if (field === 'start' && new Date(value) > new Date(prev.end)) {
        newRange.end = value;
      } else if (field === 'end' && new Date(value) < new Date(prev.start)) {
        newRange.start = value;
      }

      return newRange;
    });
  };

  const setDateRangePreset = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    setDateRange({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  };

  const forceRefresh = () => {
    // This invalidates the cache for the current theme and date range, triggering the fetch effect to run again.
    const cacheKey = `${selectedTheme}_${dateRange.start}_${dateRange.end}`;
    setLastRefresh(prev => ({ ...prev, [cacheKey]: 0 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseAnalysis = (analysisData) => {
    try {
      if (typeof analysisData === 'string') {
        return JSON.parse(analysisData);
      }
      return analysisData || {};
    } catch {
      return {};
    }
  };


  // --- JSX (UI RENDER) ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans px-3 py-26 md:py-38 mt-5 md:mt-0">
      <Metadata />

      <div className="w-full max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Latest Breaking News
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Stay informed with the latest news analyzed by Bob AI. Filter by topic to explore comprehensive bias analysis, summaries, and related coverage.
          </p>
        </div>

        {/* Theme Filter Section */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-md">
            {/* Collapsible Header */}
            <div className="flex items-center justify-between p-6">
              <button
                onClick={() => setIsTopicSelectorExpanded(!isTopicSelectorExpanded)}
                className="flex items-center space-x-3 text-left hover:bg-gray-50 transition-colors duration-200 rounded-xl p-2 -m-2 flex-1"
              >
                <h2 className="text-xl font-semibold text-gray-800">
                  🏷️ Topic Filter
                </h2>
                {/* Selected topic summary when collapsed */}
                {!isTopicSelectorExpanded && (
                  <span className="text-sm text-gray-600 flex items-center space-x-1">
                    <span>{availableThemes.find(theme => theme.value === selectedTheme)?.icon}</span>
                    <span>{availableThemes.find(theme => theme.value === selectedTheme)?.label}</span>
                  </span>
                )}
                {/* Chevron Icon */}
                <svg
                  className={`w-6 h-6 text-gray-500 transition-transform duration-200 ml-auto ${
                    isTopicSelectorExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Refresh button - always visible */}
              <button
                onClick={forceRefresh}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium ml-4"
                title="Refresh articles"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Collapsible Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isTopicSelectorExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-6 pb-6">
                <div className="flex flex-wrap justify-center gap-3">
                  {availableThemes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleThemeChange(theme.value)}
                      className={`px-4 py-2 rounded-full font-medium transition-all duration-200 flex items-center space-x-2 ${
                        selectedTheme === theme.value
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                      }`}
                    >
                      <span>{theme.icon}</span>
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Filter Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-md">
            {/* Collapsible Header */}
            <button
              onClick={() => setIsDateRangeExpanded(!isDateRangeExpanded)}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200 rounded-2xl"
            >
              <h2 className="text-xl font-semibold text-gray-800">
                📅 Date Range Filter
              </h2>
              <div className="flex items-center space-x-3">
                {/* Date Range Summary when collapsed */}
                {!isDateRangeExpanded && (
                  <span className="text-sm text-gray-600">
                    {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                  </span>
                )}
                {/* Chevron Icon */}
                <svg
                  className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${
                    isDateRangeExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Collapsible Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isDateRangeExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-6 pb-6">
                {/* Quick Date Presets */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {[
                    { days: 1, label: 'Today' },
                    { days: 7, label: 'Last 7 days' },
                    { days: 30, label: 'Last 30 days' },
                    { days: 90, label: 'Last 3 months' }
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      onClick={() => setDateRangePreset(preset.days)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Inputs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="start-date" className="text-sm font-medium text-gray-700">
                      From:
                    </label>
                    <input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label htmlFor="end-date" className="text-sm font-medium text-gray-700">
                      To:
                    </label>
                    <input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Date Range Summary when expanded */}
                <div className="mt-4 text-center">
                  <span className="text-sm text-gray-600">
                    Showing articles from <strong>{new Date(dateRange.start).toLocaleDateString()}</strong> to <strong>{new Date(dateRange.end).toLocaleDateString()}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <ClipLoader color="#3B82F6" size={40} />
            <span className="ml-3 text-gray-600">Loading latest articles...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-800 font-semibold mb-2">Error Loading Articles</div>
            <div className="text-red-600">{error}</div>
            <button
              onClick={forceRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* No Articles State */}
        {!loading && !error && articles.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-gray-500 text-lg mb-2">
              No articles found for "{availableThemes.find(t => t.value === selectedTheme)?.label || selectedTheme}"
            </div>
            <div className="text-gray-400">
              Try selecting a different topic or check back later for new content.
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const analysis = parseAnalysis(article.analysis);
              const imageUrl = article.image_url || '/assets/tricolorblack.svg';
              const formattedDate = formatDate(article.news_date || article.query_date);

              return (
                <Link
                  key={article.id}
                  to={`/article/${article.id}?source=latest`}
                  className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {/* Image Preview */}
                  <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/assets/tricolorblack.svg';
                        e.target.className = 'max-w-full max-h-full object-contain';
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {article.theme && (
                      <div className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mb-3">
                        {article.theme}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span className="font-medium">{article.source_name}</span>
                      <span>{formattedDate}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 line-clamp-2 leading-tight">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                        {article.summary}
                      </p>
                    )}
                    {analysis.bias_direction && (
                      <div className="flex justify-between items-center">
                        <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${getBiasColor(analysis.bias_direction)}`}>
                          {analysis.bias_direction.toUpperCase()} BIAS
                        </div>
                        {article.author && (
                          <span className="text-xs text-gray-400">
                            by {article.author}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                      <span>Read Analysis</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Live Update Notice */}
        {!loading && articles.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>
                {`Last updated: ${new Date(lastRefresh[`${selectedTheme}_${dateRange.start}_${dateRange.end}`] || Date.now()).toLocaleTimeString()}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LatestNews;
