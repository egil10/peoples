/**
 * OPTIMIZED Wikidata Quiz Data Pipeline
 * - Timeout protection
 * - Resume capability (skip existing files)
 * - Smaller batches
 * - Fail-fast approach
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Comprehensive country list
const COUNTRIES = [
  { code: 'Q30', name: 'USA' },
  { code: 'Q148', name: 'China' },
  { code: 'Q668', name: 'India' },
  { code: 'Q155', name: 'Brazil' },
  { code: 'Q159', name: 'Russia' },
  { code: 'Q183', name: 'Germany' },
  { code: 'Q142', name: 'France' },
  { code: 'Q145', name: 'UK' },
  { code: 'Q17', name: 'Japan' },
  { code: 'Q38', name: 'Italy' },
  { code: 'Q16', name: 'Canada' },
  { code: 'Q408', name: 'Australia' },
  { code: 'Q884', name: 'South Korea' },
  { code: 'Q96', name: 'Mexico' },
  { code: 'Q29', name: 'Spain' },
  { code: 'Q786', name: 'Dominican Republic' },
  { code: 'Q212', name: 'Ukraine' },
  { code: 'Q79', name: 'Egypt' },
  { code: 'Q43', name: 'Turkey' },
  { code: 'Q298', name: 'Chile' },
  { code: 'Q20', name: 'Norway' },
  { code: 'Q34', name: 'Sweden' },
  { code: 'Q35', name: 'Denmark' },
  { code: 'Q33', name: 'Finland' },
  { code: 'Q36', name: 'Poland' },
  { code: 'Q55', name: 'Netherlands' },
  { code: 'Q31', name: 'Belgium' },
  { code: 'Q39', name: 'Switzerland' },
  { code: 'Q40', name: 'Austria' },
  { code: 'Q37', name: 'Lithuania' },
  { code: 'Q211', name: 'Latvia' },
  { code: 'Q191', name: 'Estonia' },
  { code: 'Q27', name: 'Ireland' },
  { code: 'Q189', name: 'Iceland' },
  { code: 'Q45', name: 'Portugal' },
  { code: 'Q41', name: 'Greece' },
  { code: 'Q224', name: 'Croatia' },
  { code: 'Q215', name: 'Slovenia' },
  { code: 'Q213', name: 'Czech Republic' },
  { code: 'Q214', name: 'Slovakia' },
  { code: 'Q28', name: 'Hungary' },
  { code: 'Q218', name: 'Romania' },
  { code: 'Q219', name: 'Bulgaria' },
  { code: 'Q221', name: 'North Macedonia' },
  { code: 'Q222', name: 'Albania' },
  { code: 'Q229', name: 'Cyprus' },
  { code: 'Q233', name: 'Malta' },
  { code: 'Q236', name: 'Montenegro' },
  { code: 'Q403', name: 'Serbia' },
  { code: 'Q225', name: 'Bosnia' },
  { code: 'Q865', name: 'Taiwan' },
  { code: 'Q833', name: 'Malaysia' },
  { code: 'Q334', name: 'Singapore' },
  { code: 'Q252', name: 'Indonesia' },
  { code: 'Q928', name: 'Philippines' },
  { code: 'Q869', name: 'Thailand' },
  { code: 'Q881', name: 'Vietnam' },
  { code: 'Q843', name: 'Pakistan' },
  { code: 'Q822', name: 'Lebanon' },
  { code: 'Q796', name: 'Iraq' },
  { code: 'Q801', name: 'Israel' },
  { code: 'Q858', name: 'Syria' },
  { code: 'Q810', name: 'Jordan' },
  { code: 'Q851', name: 'Saudi Arabia' },
  { code: 'Q878', name: 'UAE' },
  { code: 'Q846', name: 'Qatar' },
  { code: 'Q817', name: 'Kuwait' },
  { code: 'Q842', name: 'Oman' },
  { code: 'Q398', name: 'Bahrain' },
  { code: 'Q889', name: 'Afghanistan' },
  { code: 'Q231', name: 'Ethiopia' },
  { code: 'Q819', name: 'Laos' },
  { code: 'Q424', name: 'Cambodia' },
  { code: 'Q836', name: 'Myanmar' },
  { code: 'Q854', name: 'Sri Lanka' },
  { code: 'Q863', name: 'Tajikistan' },
  { code: 'Q232', name: 'Kazakhstan' },
  { code: 'Q265', name: 'Uzbekistan' },
  { code: 'Q813', name: 'Kyrgyzstan' },
  { code: 'Q874', name: 'Turkmenistan' },
  { code: 'Q423', name: 'North Korea' },
  { code: 'Q711', name: 'Mongolia' },
  { code: 'Q794', name: 'Iran' },
  { code: 'Q967', name: 'Bhutan' },
  { code: 'Q837', name: 'Nepal' },
  { code: 'Q414', name: 'Argentina' },
  { code: 'Q419', name: 'Peru' },
  { code: 'Q717', name: 'Venezuela' },
  { code: 'Q739', name: 'Colombia' },
  { code: 'Q736', name: 'Ecuador' },
  { code: 'Q750', name: 'Bolivia' },
  { code: 'Q733', name: 'Paraguay' },
  { code: 'Q77', name: 'Uruguay' },
  { code: 'Q790', name: 'Haiti' },
  { code: 'Q766', name: 'Jamaica' },
  { code: 'Q241', name: 'Cuba' },
  { code: 'Q800', name: 'Costa Rica' },
  { code: 'Q774', name: 'Guatemala' },
  { code: 'Q783', name: 'Honduras' },
  { code: 'Q792', name: 'El Salvador' },
  { code: 'Q811', name: 'Nicaragua' },
  { code: 'Q804', name: 'Panama' },
  { code: 'Q258', name: 'South Africa' },
  { code: 'Q1033', name: 'Nigeria' },
  { code: 'Q1028', name: 'Morocco' },
  { code: 'Q1029', name: 'Cameroon' },
  { code: 'Q916', name: 'Angola' },
  { code: 'Q115', name: 'Kenya' },
  { code: 'Q1037', name: 'Rwanda' },
  { code: 'Q1025', name: 'Mauritius' },
  { code: 'Q1019', name: 'Madagascar' },
  { code: 'Q974', name: 'DRC' },
  { code: 'Q1036', name: 'Uganda' },
  { code: 'Q1020', name: 'Malawi' },
  { code: 'Q1049', name: 'Sudan' },
  { code: 'Q1045', name: 'Somalia' },
  { code: 'Q948', name: 'Tunisia' },
  { code: 'Q262', name: 'Algeria' },
  { code: 'Q1016', name: 'Libya' },
  { code: 'Q664', name: 'New Zealand' },
  { code: 'Q691', name: 'Papua New Guinea' },
  { code: 'Q712', name: 'Fiji' },
  { code: 'Q683', name: 'Samoa' },
];

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const BATCH_SIZE = 3; // Smaller batches
const BATCH_DELAY = 5000; // 5 sec between batches
const FETCH_TIMEOUT = 30000; // 30 sec timeout per request
const RETRY_LIMIT = 2; // Only 2 retries

function buildQuery(countryCode) {
  return `
    SELECT DISTINCT ?person ?personLabel ?image ?sitelinks ?birthYear ?deathYear 
           (SAMPLE(?occupationLabel) AS ?occupation) 
    WHERE {
      ?person wdt:P31 wd:Q5;
              wdt:P27 wd:${countryCode};
              wdt:P18 ?image;
              wikibase:sitelinks ?sitelinks.
      OPTIONAL { ?person wdt:P569 ?birthDate. }
      OPTIONAL { ?person wdt:P570 ?deathDate. }
      OPTIONAL { 
        ?person wdt:P106 ?occupationItem.
        ?occupationItem rdfs:label ?occupationLabel.
        FILTER(LANG(?occupationLabel) = "en")
      }
      OPTIONAL {
        ?person rdfs:label ?personLabelFallback.
        FILTER(LANG(?personLabelFallback) = "en")
      }
      BIND(YEAR(?birthDate) AS ?birthYear)
      BIND(YEAR(?deathDate) AS ?deathYear)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?person ?personLabel ?personLabelFallback ?image ?sitelinks ?birthYear ?deathYear
    ORDER BY DESC(?sitelinks)
    LIMIT 10
  `;
}

async function fetchWithTimeout(query, countryName, retries = RETRY_LIMIT) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use Promise.race for timeout
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
        if (attempt < retries) {
          const wait = 10000;
          console.log(`   ⏳ Rate limit (${countryName}), wait ${wait / 1000}s`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error('Rate limited');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message === 'Timeout') {
        if (attempt < retries) {
          console.log(`   ⏱️  Timeout (${countryName}), retry ${attempt}/${retries}`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        throw error;
      }

      if (attempt === retries) {
        throw error;
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function transformResults(sparqlResults) {
  const bindings = sparqlResults.results.bindings;
  return bindings.map((binding, index) => {
    // Extract name, handling cases where personLabel might be a Q code
    let name = binding.personLabel?.value || binding.personLabelFallback?.value || 'Unknown';
    
    // If name is a Wikidata Q code (starts with Q followed by numbers), use fallback
    if (name && name.match(/^Q\d+$/)) {
      name = binding.personLabelFallback?.value || `Unknown (${name})`;
    }
    
    // If still a Q code, we need to fetch it separately - for now mark as needing fix
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

async function generateCountryData(country, index, total) {
  const filename = `${country.name.replace(/\s+/g, '_')}.json`;
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const outputPath = path.join(outputDir, filename);

  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`   ⏭️  [${index + 1}/${total}] ${country.name} (skipped - exists)`);
    return { success: true, country: country.name, skipped: true };
  }

  const startTime = Date.now();

  try {
    const query = buildQuery(country.code);
    const sparqlResults = await fetchWithTimeout(query, country.name);
    const people = transformResults(sparqlResults);

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
    console.log(`   ✅ [${index + 1}/${total}] ${country.name} (${elapsed}s) - ${people[0]?.name || '?'}`);

    return { success: true, country: country.name, count: people.length };
  } catch (error) {
    console.error(`   ❌ [${index + 1}/${total}] ${country.name}: ${error.message}`);
    return { success: false, country: country.name, error: error.message };
  }
}

async function main() {
  const startTime = Date.now();

  console.log('\n🌍 Optimized Wikidata Pipeline');
  console.log('═'.repeat(50));
  console.log(`Countries: ${COUNTRIES.length} | Batch: ${BATCH_SIZE} | Delay: ${BATCH_DELAY / 1000}s\n`);

  const results = [];

  for (let i = 0; i < COUNTRIES.length; i += BATCH_SIZE) {
    const batch = COUNTRIES.slice(i, Math.min(i + BATCH_SIZE, COUNTRIES.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`📦 Batch ${batchNum}/${Math.ceil(COUNTRIES.length / BATCH_SIZE)}: ${batch.map(c => c.name).join(', ')}`);

    const promises = batch.map((c, bi) => generateCountryData(c, i + bi, COUNTRIES.length));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const done = results.filter(r => r.success).length;
    console.log(`   📊 Progress: ${done}/${COUNTRIES.length}\n`);

    if (i + BATCH_SIZE < COUNTRIES.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  // Update index
  const successes = results.filter(r => r.success && !r.skipped);
  const indexPath = path.join(__dirname, '..', 'public', 'data', 'index.json');
  const index = {
    generated: new Date().toISOString(),
    countries: COUNTRIES.filter((_, i) => results[i]?.success).map(c => ({
      name: c.name,
      code: c.code,
      file: `${c.name.replace(/\s+/g, '_')}.json`
    }))
  };
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  const totalMin = ((Date.now() - startTime) / 60000).toFixed(1);
  const totalPeople = successes.reduce((sum, r) => sum + (r.count || 0), 0);

  console.log('═'.repeat(50));
  console.log(`✨ Complete! ${totalMin} min`);
  console.log(`   ✅ Success: ${results.filter(r => r.success).length}/${COUNTRIES.length}`);
  console.log(`   👥 People: ${totalPeople}`);
  console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}\n`);
}

main().catch(console.error);
