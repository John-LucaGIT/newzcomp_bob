import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MainPage from './MainPage';
import ArticleHistory from './ArticleHistory';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <BrowserRouter>
        {/* Header */}
        <header className="fixed top-2 left-1/2 transform -translate-x-1/2 bg-white shadow-md z-50 rounded-xl max-w-5xl w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="./">
                <img src="/assets/tricolorblack.svg" alt="NewzComp Logo" className="h-10 w-10" />
              </a>
              <a href="./" className="text-md font-semibold text-gray-800 hover:text-blue-600 transition">
                Home
              </a>
              <Link to="/stored-articles" className="text-md font-semibold text-gray-800 hover:text-blue-600 transition">
                Stored Articles
              </Link>
            </div>
            <a href="https://www.newzcomp.com" className="text-md font-semibold text-gray-800 hover:text-blue-600 transition backtonewzcomp">
                Back to NewzComp
            </a>
            <div className="flex items-center space-x-4">
              <a href="https://twitter.com/newzcomp" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-twitter text-xl text-gray-500 hover:text-blue-400 transition"></i>
              </a>
              <a href="https://www.instagram.com/newzcomp" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-instagram text-xl text-gray-500 hover:text-pink-500 transition"></i>
              </a>
              <a href="https://www.linkedin.com/company/newzcomp" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-linkedin text-xl text-gray-500 hover:text-blue-600 transition"></i>
              </a>
            </div>
          </div>
        </header>
        {/* Add margin-top to prevent content being hidden behind the fixed header */}
        <div className="pt-0">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/stored-articles" element={<ArticleHistory />} />
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
