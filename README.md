# 🌍 Wikidata People Quiz

A minimalist, educational quiz application testing your knowledge of notable people from different countries. Built for static hosting on GitHub Pages.

## 🎯 Overview

This application presents users with images of the **Top 10 most-linked individuals** from a selected country, sourced directly from Wikidata. Users attempt to identify each person by typing their name.

**Live Demo:** [https://egil10.github.io/peoples](https://egil10.github.io/peoples)

## 📦 Tech Stack

- **Frontend:** React 18
- **Hosting:** GitHub Pages (Static files only)
- **Icons:** Lucide React
- **Styling:** Plain CSS with custom design system
- **Data Source:** Wikidata SPARQL endpoint
- **Data Pipeline:** Node.js script

## 🏗️ Architecture

### Static-First Design

This application is designed for GitHub Pages, which means:

1. **Data pipeline runs offline** - SPARQL queries are executed via a Node.js script
2. **Static JSON files** - Quiz data is committed to the repository
3. **Pure client-side React** - No server-side rendering or APIs at runtime
4. **Zero backend** - Everything runs in the browser

### Data Pipeline

The data pipeline (`scripts/data-pipeline.js`) performs the following:

1. **Queries Wikidata SPARQL endpoint** for each configured country
2. **Filters for:**
   - Humans only (`wdt:P31 wd:Q5`)
   - Specific country of citizenship (`wdt:P27`)
   - Must have an image (`wdt:P18`)
3. **Ranks by sitelinks** - Number of Wikipedia language links (wikibase:sitelinks)
4. **Selects Top 10** for each country
5. **Extracts fields:**
   - `name` - Full name (personLabel)
   - `image` - Wikimedia Commons URL
   - `sitelinks` - Ranking score
   - `birthYear` - For hints (optional)
   - `deathYear` - For hints (optional)
   - `occupation` - For hints (optional)
6. **Generates normalized answer keys** for case-insensitive, accent-insensitive matching
7. **Outputs static JSON files** to `public/data/`

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/egil10/peoples.git
cd peoples

# Install dependencies
npm install
```

### Generate Quiz Data

**Important:** Run this BEFORE starting the development server or building for production.

```bash
npm run generate-data
```

This will:
- Query Wikidata for all configured countries
- Generate JSON files in `public/data/`
- Take approximately 10-15 seconds (respects Wikidata rate limits)

### Development

```bash
# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build static files for deployment
npm run build
```

Output will be in the `build/` directory.

### Deploy to GitHub Pages

```bash
# Deploy to GitHub Pages
npm run deploy
```

This will build and push the `build/` directory to the `gh-pages` branch.

## 📁 Project Structure

```
peoples/
├── docs/                      # Documentation files
│   ├── ENDLESS_QUIZ_COMPLETE.md
│   ├── FINAL_IMPLEMENTATION.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── PERFORMANCE_OPTIMIZATIONS.md
│   └── VERCEL_DEPLOY.md
├── public/
│   ├── data/                  # Static quiz data (generated)
│   │   ├── index.json         # List of available countries
│   │   ├── Norway.json        # Quiz data for Norway
│   │   ├── France.json        # Quiz data for France
│   │   └── ...                # 100+ country JSON files
│   ├── index.html             # HTML template
│   └── manifest.json          # PWA manifest
├── scripts/
│   ├── data-pipeline.js       # Data generation script
│   └── fetch-flags.js         # Flag fetching utility
├── src/
│   ├── components/
│   │   ├── EndlessQuiz.js     # Main endless quiz component
│   │   ├── EndlessQuiz.css
│   │   ├── Quiz.js            # Legacy quiz component
│   │   ├── Quiz.css
│   │   ├── Results.js         # Results/score screen
│   │   ├── Results.css
│   │   ├── CountrySelector.js # Country selection screen
│   │   └── CountrySelector.css
│   ├── App.js                 # Main app component
│   ├── index.js               # React entry point
│   └── index.css              # Global styles
├── package.json
├── vercel.json                # Vercel deployment config
└── README.md
```

## 🔧 Configuration

### Adding New Countries

To add a new country to the quiz:

1. Open `scripts/data-pipeline.js`
2. Add to the `COUNTRIES` array:

```javascript
const COUNTRIES = [
  // Existing countries...
  { code: 'Q38', name: 'Italy', file: 'Italy.json' },  // New country
];
```

3. Find the Wikidata entity code (Q-code) at [wikidata.org](https://www.wikidata.org)
4. Run `npm run generate-data`
5. Commit the new JSON file

### Customizing the Quiz

**Number of questions:** Edit the `LIMIT` in the SPARQL query (line 65 in `data-pipeline.js`)

**Ranking metric:** Currently uses `sitelinks`. To use a different metric, modify the SPARQL query and ORDER BY clause.

**Required fields:** To add more data fields, extend the SPARQL SELECT and OPTIONAL clauses.

## 🎨 Design Philosophy

- **Speed First:** Minimal CSS, no heavy frameworks
- **Mobile-First:** Fully responsive, optimized for small screens
- **Calm & Educational:** Neutral colors, high contrast, clear typography
- **Trustworthy:** Transparent data sourcing from Wikidata

## 🧪 Answer Checking Logic

Answers are normalized to be:
- **Case insensitive** - "Barack Obama" = "barack obama"
- **Accent insensitive** - "François" = "Francois"
- **Punctuation insensitive** - "O'Brien" = "OBrien"
- **Whitespace normalized** - Multiple spaces reduced to one

This is handled by the `normalizeForAnswerKey()` function.

## 📊 Data Transparency

All quiz data is:
- **Publicly sourced** from Wikidata
- **Committed to the repository** (see `public/data/`)
- **Includes metadata** such as generation timestamp and ranking scores
- **Verifiable** - Each person's Wikidata URL is included

### Data Format

Each country JSON file follows this structure:

```json
{
  "country": "Norway",
  "countryCode": "Q20",
  "generated": "2025-12-14T01:00:00.000Z",
  "rankingMetric": "sitelinks",
  "people": [
    {
      "id": 1,
      "name": "Henrik Ibsen",
      "image": "https://commons.wikimedia.org/...",
      "sitelinks": 198,
      "birthYear": "1828",
      "deathYear": "1906",
      "occupation": "playwright",
      "wikidataUrl": "http://www.wikidata.org/entity/Q36661",
      "answerKey": "henrik ibsen"
    }
  ]
}
```

## 🚫 Hard Constraints

This is a **static-only** application. The following are intentionally NOT included:

- ❌ Server-side rendering (SSR)
- ❌ Dynamic data fetching at runtime
- ❌ External API calls (except during data generation)
- ❌ User accounts or authentication
- ❌ Leaderboards or multiplayer features
- ❌ Heavy animations or gamification

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Add new countries or improve the UI
4. Run `npm run generate-data` if you modified countries
5. Test thoroughly on mobile
6. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Data:** [Wikidata](https://www.wikidata.org) - Collaborative knowledge base
- **Images:** [Wikimedia Commons](https://commons.wikimedia.org) - Free media repository
- **Icons:** [Lucide](https://lucide.dev) - Beautiful open-source icons

## 🐛 Known Issues

- Some individuals may have outdated or unofficial images
- Birth/death years may be missing for recently deceased persons
- Occupation labels are in English only

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Verify data freshness by re-running the pipeline

---

**Built with ❤️ for education and exploration.**