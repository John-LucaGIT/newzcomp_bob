import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MainPage from './MainPage';
import ArticleHistory from './ArticleHistory';
import FeedbackPage from './FeedbackPage';
import ArticlePage from './components/ArticlePage';
import { Helmet } from 'react-helmet';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  {
    /* Google Analytics script */
  }

  return (
    <>
      {/* Metadata for SEO and social sharing */}
      <Helmet>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-X5PPN0KRWV"></script>
        <script>
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-X5PPN0KRWV');
        `}
        </script>
      </Helmet>
      <div className="min-h-screen bg-gray-100">
        <BrowserRouter>
          {/* Responsive Header */}
          <header className="fixed top-2 left-1/2 transform -translate-x-1/2 bg-white shadow-md z-50 rounded-xl max-w-5xl w-full px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Logo + Home */}
              <div className="flex items-center space-x-2">
                <a href="/" className="flex-shrink-0">
                  <img src="/assets/tricolorblack.svg" alt="NewzComp Logo" className="h-10 w-10" />
                </a>
                <a href="/" className="hidden md:block px-4 py-2 text-base md:text-md font-semibold text-gray-800 hover:text-blue-600 transition">
                  Home
                </a>
              </div>
              {/* Hamburger for mobile */}
              <button className="md:hidden ml-2 text-gray-700 focus:outline-none" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
              {/* Right: Links */}
              <nav className={`flex-col md:flex md:flex-row md:items-center md:space-x-4 absolute md:static top-16 right-0 w-full md:w-auto bg-white md:bg-transparent shadow-md md:shadow-none rounded-xl md:rounded-none z-40 transition-all duration-200 ${menuOpen ? 'flex' : 'hidden md:flex'}`} style={{ justifyContent: 'flex-end' }}>
                {/* Home link for mobile menu */}
                <a href="./" className="block md:hidden px-4 py-2 text-base md:text-md font-semibold text-gray-800 hover:text-blue-600 transition" onClick={() => setMenuOpen(false)}>
                  Home
                </a>
                <Link to="/stored-articles" className="block px-4 py-2 text-base md:text-md font-semibold text-gray-800 hover:text-blue-600 transition" onClick={() => setMenuOpen(false)}>
                  History
                </Link>
                <Link to="/feedback" className="block px-4 py-2 text-base md:text-md font-semibold text-gray-800 hover:text-blue-600 transition" onClick={() => setMenuOpen(false)}>
                  Feedback
                </Link>
                <a href="https://www.newzcomp.com" className="block px-4 py-2 text-base md:text-md font-semibold text-gray-800 hover:text-blue-600 transition" onClick={() => setMenuOpen(false)}>
                  NewzComp
                </a>
                <div className="flex items-center justify-center space-x-3 px-4 py-2 md:p-0">
                  <a href="https://twitter.com/newzcomp" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-twitter text-lg md:text-xl text-gray-500 hover:text-blue-400 transition"></i>
                  </a>
                  <a href="https://www.instagram.com/newzcomp" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-instagram text-lg md:text-xl text-gray-500 hover:text-pink-500 transition"></i>
                  </a>
                  <a href="https://www.linkedin.com/company/newzcomp" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-linkedin text-lg md:text-xl text-gray-500 hover:text-blue-600 transition"></i>
                  </a>
                </div>
              </nav>
            </div>
          </header>
          {/* Add margin-top to prevent content being hidden behind the fixed header */}
          <div className="pt-0">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/stored-articles" element={<ArticleHistory />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/article/:bobid" element={<ArticlePage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
