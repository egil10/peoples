/**
 * Wikidata Quiz Data Pipeline
 * 
 * This script queries the Wikidata SPARQL endpoint to fetch the top 10
 * most-linked (by sitelinks) individuals from each configured country.
 * 
 * Output: Static JSON files in public/data/ directory
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration: Add more countries as needed
const COUNTRIES = [
  { code: 'Q20', name: 'Norway', file: 'Norway.json' },
  { code: 'Q142', name: 'France', file: 'France.json' },
  { code: 'Q17', name: 'Japan', file: 'Japan.json' },
  { code: 'Q30', name: 'USA', file: 'USA.json' },
  { code: 'Q145', name: 'UK', file: 'UK.json' },
  { code: 'Q183', name: 'Germany', file: 'Germany.json' },
  { code: 'Q96', name: 'Mexico', file: 'Mexico.json' },
  { code: 'Q155', name: 'Brazil', file: 'Brazil.json' },
  { code: 'Q668', name: 'India', file: 'India.json' },
  { code: 'Q159', name: 'Russia', file: 'Russia.json' },
  { code: 'Q38', name: 'Italy', file: 'Italy.json' },
  { code: 'Q29', name: 'Spain', file: 'Spain.json' },
  { code: 'Q16', name: 'Canada', file: 'Canada.json' },
  { code: 'Q148', name: 'China', file: 'China.json' },
  { code: 'Q408', name: 'Australia', file: 'Australia.json' },
  { code: 'Q215', name: 'Slovenia', file: 'Slovenia.json' },
  { code: 'Q39', name: 'Switzerland', file: 'Switzerland.json' },
  { code: 'Q55', name: 'Netherlands', file: 'Netherlands.json' },
  { code: 'Q34', name: 'Sweden', file: 'Sweden.json' },
  { code: 'Q35', name: 'Denmark', file: 'Denmark.json' }
];

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * Constructs SPARQL query for a specific country
 * Simplified to avoid GROUP_CONCAT issues with Wikidata labels
 */
function buildQuery(countryCode) {
  return `
    SELECT DISTINCT ?person ?personLabel ?image ?sitelinks ?birthYear ?deathYear 
           (SAMPLE(?occupationLabel) AS ?occupation) 
           (SAMPLE(?description) AS ?desc)
    WHERE {
      ?person wdt:P31 wd:Q5;                    # Instance of human
              wdt:P27 wd:${countryCode};         # Country of citizenship
              wdt:P18 ?image;                    # Has image
              wikibase:sitelinks ?sitelinks.     # Number of sitelinks
      
      OPTIONAL { ?person wdt:P569 ?birthDate. }
      OPTIONAL { ?person wdt:P570 ?deathDate. }
      OPTIONAL { 
        ?person wdt:P106 ?occupationItem.
        ?occupationItem rdfs:label ?occupationLabel.
        FILTER(LANG(?occupationLabel) = "en")
      }
      OPTIONAL {
        ?person schema:description ?description.
        FILTER(LANG(?description) = "en")
      }
      
      BIND(YEAR(?birthDate) AS ?birthYear)
      BIND(YEAR(?deathDate) AS ?deathYear)
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?person ?personLabel ?image ?sitelinks ?birthYear ?deathYear
    ORDER BY DESC(?sitelinks)
    LIMIT 10
  `;
}

/**
 * Fetches data from Wikidata SPARQL endpoint
 */
async function fetchWikidataResults(query, countryName) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WikidataQuizApp/1.0 (Educational Purpose)',
        'Accept': 'application/sparql-results+json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`   ❌ Fetch failed for ${countryName}:`, error.message);
    throw error;
  }
}

/**
 * Transforms SPARQL results into clean quiz data format
 */
function transformResults(sparqlResults) {
  const bindings = sparqlResults.results.bindings;

  return bindings.map((binding, index) => ({
    id: index + 1,
    name: binding.personLabel?.value || 'Unknown',
    image: binding.image?.value || '',
    sitelinks: parseInt(binding.sitelinks?.value || '0', 10),
    birthYear: binding.birthYear?.value || null,
    deathYear: binding.deathYear?.value || null,
    occupation: binding.occupation?.value || null,
    description: binding.desc?.value || null,
    wikidataUrl: binding.person?.value || ''
  }));
}

/**
 * Normalizes text for answer checking (removes accents, case, punctuation)
 */
function normalizeForAnswerKey(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates static JSON file for a country
 */
async function generateCountryData(country, index, total) {
  const startTime = Date.now();
  console.log(`📊 [${index + 1}/${total}] Processing: ${country.name}...`);

  try {
    const query = buildQuery(country.code);
    const sparqlResults = await fetchWikidataResults(query, country.name);
    const people = transformResults(sparqlResults);

    // Add normalized answer key for each person
    people.forEach(person => {
      person.answerKey = normalizeForAnswerKey(person.name);
    });

    const output = {
      country: country.name,
      countryCode: country.code,
      generated: new Date().toISOString(),
      rankingMetric: 'sitelinks',
      people: people
    };

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON file
    const outputPath = path.join(outputDir, country.file);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ✅ [${index + 1}/${total}] ${country.name} complete (${elapsed}s)`);
    console.log(`      Top: ${people[0]?.name} (${people[0]?.sitelinks} sitelinks)\n`);

    return { success: true, country: country.name, data: output };
  } catch (error) {
    console.error(`   ❌ [${index + 1}/${total}] ${country.name} failed: ${error.message}\n`);
    return { success: false, country: country.name, error: error.message };
  }
}

/**
 * Main execution - now runs all fetches in parallel!
 */
async function main() {
  const overallStartTime = Date.now();

  console.log('\n🚀 Wikidata Quiz Data Pipeline');
  console.log('═'.repeat(50));
  console.log(`Processing ${COUNTRIES.length} countries in parallel...\n`);

  // Create all promises at once for parallel execution
  const promises = COUNTRIES.map((country, index) =>
    generateCountryData(country, index, COUNTRIES.length)
  );

  // Wait for all to complete
  const results = await Promise.all(promises);

  // Count successes and failures
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  // Generate index file with all available countries
  const indexPath = path.join(__dirname, '..', 'public', 'data', 'index.json');
  const index = {
    generated: new Date().toISOString(),
    countries: COUNTRIES.filter((_, i) => results[i].success).map(c => ({
      name: c.name,
      code: c.code,
      file: c.file
    }))
  };

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

  const totalTime = ((Date.now() - overallStartTime) / 1000).toFixed(2);

  console.log('═'.repeat(50));
  console.log('✨ Data pipeline complete!');
  console.log(`   ✅ Successful: ${successes.length}/${COUNTRIES.length}`);
  if (failures.length > 0) {
    console.log(`   ❌ Failed: ${failures.length}`);
    failures.forEach(f => console.log(`      - ${f.country}`));
  }
  console.log(`   ⏱️  Total time: ${totalTime}s`);
  console.log(`   📁 Location: public/data/\n`);
}

// Run the pipeline
main().catch(error => {
  console.error('\n💥 Pipeline failed:', error);
  process.exit(1);
});
