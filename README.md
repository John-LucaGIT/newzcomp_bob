# NewzComp Bob

NewzComp Bob is a web application designed to analyze news articles for bias and provide a comprehensive summary of the facts. It leverages AI-powered tools to extract keywords, fetch related articles, and analyze their content for bias and factual accuracy. The application aims to help users better understand the perspectives and biases present in news reporting.

## Features

- **Article Analysis**: Analyze a news article by providing its URL.
- **Keyword Extraction**: Automatically generate search queries based on the article's title and description.
- **Related Articles**: Fetch related articles from various sources using NewsAPI.
- **Content Scraping**: Scrape and summarize the content of related articles.
- **Bias Detection**: Use AI to detect bias in articles and provide a structured report with bias ratings and directions.
- **Markdown Output**: Display the analysis in a clean, readable Markdown format.

## Technology Stack

- **Backend**: Node.js with Express.js
  - Uses Puppeteer and JSDOM for web scraping.
  - Integrates OpenAI for AI-powered analysis.
  - Fetches related articles using NewsAPI.
- **Frontend**: React with Vite
  - Displays the analysis results in a user-friendly interface.
  - Uses ReactMarkdown to render Markdown content.
- **Styling**: TailwindCSS for modern and responsive design.

## How It Works

1. Enter the URL of a news article in the input field.
2. The backend extracts keywords from the article and fetches related articles.
3. The content of the related articles is scraped and analyzed using OpenAI.
4. The frontend displays the analysis, including a summary of the facts, bias ratings, and bias analysis.

## Try it out

- https://bob.newzcomp.com

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/newzcomp_bob.git
   cd newzcomp_bob

2. Install dependencies for the backend:
    ```bash
    npm install

3. Navigate to the bob directory and install dependencies for the frontend:
    ```bash
    cd bob
    npm install

4. Create a .env file in the root directory and add the following environment variables:
  PORT=3001
  OPENAI_API_KEY=your_openai_api_key
  NEWS_API_KEY=your_news_api_key

5. Start the backend server:
    ```bash
    npm start

6. Start the frontend development server:
    ```bash
    cd bob
    npm run dev

7. Open your browser and navigate to http://localhost:5173
