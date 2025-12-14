/**
 * Retry script for failed large countries (USA, Germany, France)
 * Uses more aggressive timeout and retry settings
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const PEOPLE_LIMIT = 50;
const FETCH_TIMEOUT = 120000; // 2 minutes timeout
const RETRY_LIMIT = 5; // 5 retries
const RETRY_DELAY = 10000; // 10 seconds between retries

const FAILED_COUNTRIES = [
  { code: 'Q30', name: 'USA' },
  { code: 'Q183', name: 'Germany' },
  { code: 'Q142', name: 'France' },
];

function buildQuery(countryCode) {
  // Optimized query for large countries: require minimum 50 sitelinks to drastically reduce dataset
  // This makes the query much faster by filtering out less famous people upfront
  return `
    SELECT DISTINCT ?person ?personLabel ?image ?sitelinks ?birthYear ?deathYear 
           (SAMPLE(?occupationLabel) AS ?occupation) 
    WHERE {
      ?person wdt:P31 wd:Q5;
              wdt:P27 wd:${countryCode};
              wdt:P18 ?image;
              wikibase:sitelinks ?sitelinks.
      FILTER(?sitelinks >= 50)
      OPTIONAL { ?person wdt:P569 ?birthDate. }
      OPTIONAL { ?person wdt:P570 ?deathDate. }
      OPTIONAL { 
        ?person wdt:P106 ?occupationItem.
        ?occupationItem rdfs:label ?occupationLabel.
        FILTER(LANG(?occupationLabel) = "en")
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?person ?personLabel ?image ?sitelinks ?birthYear ?deathYear
    ORDER BY DESC(?sitelinks)
    LIMIT ${PEOPLE_LIMIT}
  `;
}

async function fetchWithTimeout(query, countryName) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      console.log(`   🔄 Attempt ${attempt}/${RETRY_LIMIT} for ${countryName}...`);
      
      const fetchPromise = fetch(url, {
        headers: {
          'User-Agent': 'WikidataQuizApp/2.0',
          'Accept': 'application/sparql-results+json'
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), FETCH_TIMEOUT)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.status === 429) {
        if (attempt < RETRY_LIMIT) {
          const wait = 30000 * attempt; // 30s, 60s, 90s, 120s
          console.log(`   ⏳ Rate limit (${countryName}), wait ${wait / 1000}s`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error('Rate limited');
      }

      if (response.status >= 500 && response.status < 600) {
        if (attempt < RETRY_LIMIT) {
          const wait = 15000 * attempt;
          console.log(`   ⚠️  Server error ${response.status} (${countryName}), retry ${attempt}/${RETRY_LIMIT} (waiting ${wait / 1000}s)`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message === 'Timeout') {
        if (attempt < RETRY_LIMIT) {
          const retryDelay = 20000 * attempt; // 20s, 40s, 60s, 80s
          console.log(`   ⏱️  Timeout (${countryName}), retry ${attempt}/${RETRY_LIMIT} (waiting ${retryDelay / 1000}s)`);
          await new Promise(r => setTimeout(r, retryDelay));
          continue;
        }
        throw error;
      }

      if (attempt === RETRY_LIMIT) {
        throw error;
      }

      const retryDelay = RETRY_DELAY * attempt;
      console.log(`   🔄 Error (${countryName}): ${error.message}, retry in ${retryDelay / 1000}s`);
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
}

function transformResults(sparqlResults) {
  const bindings = sparqlResults.results.bindings;
  return bindings.map((binding, index) => {
    let name = binding.personLabel?.value || binding.personLabelFallback?.value || 'Unknown';
    
    if (name && name.match(/^Q\d+$/)) {
      name = binding.personLabelFallback?.value || `Unknown (${name})`;
    }
    
    if (name && name.match(/^Q\d+$/)) {
      name = `Unknown (${name})`;
    }
    
    const nameForAnswerKey = name.replace(/^Unknown \(Q\d+\)$/, '').toLowerCase();
    const answerKey = nameForAnswerKey && !nameForAnswerKey.startsWith('unknown')
      ? nameForAnswerKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
      : '';
    
    return {
      id: index + 1,
      name: name,
      image: binding.image?.value || '',
      sitelinks: parseInt(binding.sitelinks?.value || '0', 10),
      birthYear: binding.birthYear?.value || null,
      deathYear: binding.deathYear?.value || null,
      occupation: binding.occupation?.value || null,
      wikidataUrl: binding.person?.value || '',
      answerKey: answerKey
    };
  });
}

async function generateCountryData(country) {
  const filename = `${country.name.replace(/\s+/g, '_')}.json`;
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const outputPath = path.join(outputDir, filename);

  const startTime = Date.now();
  console.log(`\n🌍 Fetching ${country.name}...`);

  try {
    const query = buildQuery(country.code);
    const sparqlResults = await fetchWithTimeout(query, country.name);
    const people = transformResults(sparqlResults);

    if (people.length === 0) {
      throw new Error('No people found');
    }

    const output = {
      country: country.name,
      countryCode: country.code,
      generated: new Date().toISOString(),
      rankingMetric: 'sitelinks',
      people: people
    };

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ ${country.name} complete (${elapsed}s) - ${people.length} people`);
    console.log(`      Top: ${people[0]?.name || '?'} (${people[0]?.sitelinks || 0} sitelinks)`);

    return { success: true, country: country.name, count: people.length };
  } catch (error) {
    console.error(`   ❌ ${country.name}: ${error.message}`);
    return { success: false, country: country.name, error: error.message };
  }
}

async function main() {
  console.log('\n🔄 Retrying Failed Large Countries');
  console.log('═'.repeat(50));
  console.log(`Countries: ${FAILED_COUNTRIES.length}`);
  console.log(`Timeout: ${FETCH_TIMEOUT / 1000}s | Retries: ${RETRY_LIMIT}\n`);

  const results = [];

  // Process one at a time with delays to avoid rate limits
  for (let i = 0; i < FAILED_COUNTRIES.length; i++) {
    const country = FAILED_COUNTRIES[i];
    const result = await generateCountryData(country);
    results.push(result);

    // Wait between countries
    if (i < FAILED_COUNTRIES.length - 1) {
      console.log(`   ⏳ Waiting 15s before next country...\n`);
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  // Update index
  const indexPath = path.join(__dirname, '..', 'public', 'data', 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const successCountries = results.filter(r => r.success).map(r => r.country);
    
    // Update index with successful countries
    successCountries.forEach(countryName => {
      const country = FAILED_COUNTRIES.find(c => c.name === countryName);
      if (country) {
        const existing = index.countries.find(c => c.name === countryName);
        if (existing) {
          existing.file = `${countryName.replace(/\s+/g, '_')}.json`;
        } else {
          index.countries.push({
            name: countryName,
            code: country.code,
            file: `${countryName.replace(/\s+/g, '_')}.json`
          });
        }
      }
    });
    
    index.generated = new Date().toISOString();
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  console.log('\n═'.repeat(50));
  console.log(`✨ Retry complete!`);
  console.log(`   ✅ Success: ${results.filter(r => r.success).length}/${FAILED_COUNTRIES.length}`);
  console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}`);
  if (results.filter(r => !r.success).length > 0) {
    console.log(`   Failed countries: ${results.filter(r => !r.success).map(r => r.country).join(', ')}`);
  }
  console.log('');
}

main().catch(console.error);

