/**
 * OPTIMIZED Wikidata Quiz Data Pipeline
 * - Timeout protection
 * - Resume capability (skip existing files)
 * - Smaller batches
 * - Fail-fast approach
 * - All sovereign states (200+ countries)
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Comprehensive list of all sovereign states (195 UN member states + 2 observer states + other recognized states)
const COUNTRIES = [
  // Major countries
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
  { code: 'Q902', name: 'Bangladesh' },
  { code: 'Q928', name: 'Philippines' },
  { code: 'Q252', name: 'Indonesia' },
  { code: 'Q843', name: 'Pakistan' },
  { code: 'Q1033', name: 'Nigeria' },
  { code: 'Q258', name: 'South Africa' },
  { code: 'Q414', name: 'Argentina' },
  { code: 'Q739', name: 'Colombia' },
  { code: 'Q212', name: 'Ukraine' },
  { code: 'Q36', name: 'Poland' },
  { code: 'Q55', name: 'Netherlands' },
  { code: 'Q31', name: 'Belgium' },
  { code: 'Q32', name: 'Luxembourg' },
  { code: 'Q39', name: 'Switzerland' },
  { code: 'Q40', name: 'Austria' },
  { code: 'Q45', name: 'Portugal' },
  { code: 'Q41', name: 'Greece' },
  { code: 'Q20', name: 'Norway' },
  { code: 'Q34', name: 'Sweden' },
  { code: 'Q35', name: 'Denmark' },
  { code: 'Q33', name: 'Finland' },
  { code: 'Q27', name: 'Ireland' },
  { code: 'Q189', name: 'Iceland' },
  { code: 'Q37', name: 'Lithuania' },
  { code: 'Q211', name: 'Latvia' },
  { code: 'Q191', name: 'Estonia' },
  { code: 'Q224', name: 'Croatia' },
  { code: 'Q215', name: 'Slovenia' },
  { code: 'Q217', name: 'Moldova' },
  { code: 'Q213', name: 'Czech Republic' },
  { code: 'Q214', name: 'Slovakia' },
  { code: 'Q28', name: 'Hungary' },
  { code: 'Q218', name: 'Romania' },
  { code: 'Q219', name: 'Bulgaria' },
  { code: 'Q221', name: 'North Macedonia' },
  { code: 'Q222', name: 'Albania' },
  { code: 'Q229', name: 'Cyprus' },
  { code: 'Q230', name: 'Georgia' },
  { code: 'Q233', name: 'Malta' },
  { code: 'Q236', name: 'Montenegro' },
  { code: 'Q403', name: 'Serbia' },
  { code: 'Q225', name: 'Bosnia' },
  { code: 'Q227', name: 'Azerbaijan' },
  { code: 'Q184', name: 'Belarus' },
  { code: 'Q228', name: 'Andorra' },
  { code: 'Q235', name: 'Monaco' },
  { code: 'Q347', name: 'Liechtenstein' },
  { code: 'Q238', name: 'San Marino' },
  { code: 'Q237', name: 'Vatican City' },
  // Asia
  { code: 'Q865', name: 'Taiwan' },
  { code: 'Q833', name: 'Malaysia' },
  { code: 'Q334', name: 'Singapore' },
  { code: 'Q869', name: 'Thailand' },
  { code: 'Q881', name: 'Vietnam' },
  { code: 'Q819', name: 'Laos' },
  { code: 'Q424', name: 'Cambodia' },
  { code: 'Q836', name: 'Myanmar' },
  { code: 'Q854', name: 'Sri Lanka' },
  { code: 'Q889', name: 'Afghanistan' },
  { code: 'Q863', name: 'Tajikistan' },
  { code: 'Q232', name: 'Kazakhstan' },
  { code: 'Q265', name: 'Uzbekistan' },
  { code: 'Q813', name: 'Kyrgyzstan' },
  { code: 'Q874', name: 'Turkmenistan' },
  { code: 'Q423', name: 'North Korea' },
  { code: 'Q711', name: 'Mongolia' },
  { code: 'Q794', name: 'Iran' },
  { code: 'Q917', name: 'Bhutan' },
  { code: 'Q837', name: 'Nepal' },
  { code: 'Q921', name: 'Brunei' },
  { code: 'Q805', name: 'Yemen' },
  { code: 'Q822', name: 'Lebanon' },
  { code: 'Q826', name: 'Maldives' },
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
  { code: 'Q399', name: 'Armenia' },
  // Americas
  { code: 'Q419', name: 'Peru' },
  { code: 'Q717', name: 'Venezuela' },
  { code: 'Q736', name: 'Ecuador' },
  { code: 'Q750', name: 'Bolivia' },
  { code: 'Q733', name: 'Paraguay' },
  { code: 'Q77', name: 'Uruguay' },
  { code: 'Q298', name: 'Chile' },
  { code: 'Q790', name: 'Haiti' },
  { code: 'Q766', name: 'Jamaica' },
  { code: 'Q241', name: 'Cuba' },
  { code: 'Q786', name: 'Dominican Republic' },
  { code: 'Q800', name: 'Costa Rica' },
  { code: 'Q774', name: 'Guatemala' },
  { code: 'Q783', name: 'Honduras' },
  { code: 'Q792', name: 'El Salvador' },
  { code: 'Q811', name: 'Nicaragua' },
  { code: 'Q804', name: 'Panama' },
  { code: 'Q754', name: 'Trinidad and Tobago' },
  { code: 'Q244', name: 'Barbados' },
  { code: 'Q778', name: 'Bahamas' },
  { code: 'Q781', name: 'Antigua and Barbuda' },
  { code: 'Q763', name: 'Saint Kitts and Nevis' },
  { code: 'Q760', name: 'Saint Lucia' },
  { code: 'Q757', name: 'Saint Vincent and the Grenadines' },
  { code: 'Q769', name: 'Grenada' },
  { code: 'Q784', name: 'Dominica' },
  { code: 'Q242', name: 'Belize' },
  { code: 'Q734', name: 'Guyana' },
  { code: 'Q730', name: 'Suriname' },
  // Africa
  { code: 'Q79', name: 'Egypt' },
  { code: 'Q43', name: 'Turkey' },
  { code: 'Q115', name: 'Ethiopia' },
  { code: 'Q1028', name: 'Morocco' },
  { code: 'Q1009', name: 'Cameroon' },
  { code: 'Q916', name: 'Angola' },
  { code: 'Q114', name: 'Kenya' },
  { code: 'Q1037', name: 'Rwanda' },
  { code: 'Q1027', name: 'Mauritius' },
  { code: 'Q1019', name: 'Madagascar' },
  { code: 'Q974', name: 'DRC' },
  { code: 'Q1036', name: 'Uganda' },
  { code: 'Q1020', name: 'Malawi' },
  { code: 'Q1049', name: 'Sudan' },
  { code: 'Q1045', name: 'Somalia' },
  { code: 'Q948', name: 'Tunisia' },
  { code: 'Q262', name: 'Algeria' },
  { code: 'Q1016', name: 'Libya' },
  { code: 'Q924', name: 'Tanzania' },
  { code: 'Q1029', name: 'Mozambique' },
  { code: 'Q117', name: 'Ghana' },
  { code: 'Q1041', name: 'Senegal' },
  { code: 'Q954', name: 'Zimbabwe' },
  { code: 'Q953', name: 'Zambia' },
  { code: 'Q963', name: 'Botswana' },
  { code: 'Q1030', name: 'Namibia' },
  { code: 'Q657', name: 'Chad' },
  { code: 'Q1008', name: 'Ivory Coast' },
  { code: 'Q965', name: 'Burkina Faso' },
  { code: 'Q1032', name: 'Niger' },
  { code: 'Q1006', name: 'Guinea' },
  { code: 'Q962', name: 'Benin' },
  { code: 'Q945', name: 'Togo' },
  { code: 'Q1044', name: 'Sierra Leone' },
  { code: 'Q1014', name: 'Liberia' },
  { code: 'Q986', name: 'Eritrea' },
  { code: 'Q967', name: 'Burundi' },
  { code: 'Q1007', name: 'Guinea-Bissau' },
  { code: 'Q983', name: 'Equatorial Guinea' },
  { code: 'Q1000', name: 'Gabon' },
  { code: 'Q971', name: 'Republic of the Congo' },
  { code: 'Q929', name: 'Central African Republic' },
  { code: 'Q1039', name: 'São Tomé and Príncipe' },
  { code: 'Q1013', name: 'Lesotho' },
  { code: 'Q912', name: 'Mali' },
  { code: 'Q1050', name: 'Eswatini' },
  { code: 'Q970', name: 'Comoros' },
  { code: 'Q977', name: 'Djibouti' },
  { code: 'Q1031', name: 'Gambia' },
  { code: 'Q1011', name: 'Cape Verde' },
  { code: 'Q1025', name: 'Mauritania' },
  { code: 'Q958', name: 'South Sudan' },
  { code: 'Q1042', name: 'Seychelles' },
  // Pacific
  { code: 'Q664', name: 'New Zealand' },
  { code: 'Q691', name: 'Papua New Guinea' },
  { code: 'Q712', name: 'Fiji' },
  { code: 'Q683', name: 'Samoa' },
  { code: 'Q678', name: 'Tonga' },
  { code: 'Q686', name: 'Vanuatu' },
  { code: 'Q695', name: 'Palau' },
  { code: 'Q702', name: 'Micronesia' },
  { code: 'Q709', name: 'Marshall Islands' },
  { code: 'Q710', name: 'Kiribati' },
  { code: 'Q672', name: 'Tuvalu' },
  { code: 'Q685', name: 'Solomon Islands' },
  { code: 'Q697', name: 'Nauru' },
  { code: 'Q574', name: 'East Timor' },
];

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const BATCH_SIZE = 2; // Smaller batches to reduce rate limiting
const BATCH_DELAY = 6000; // 6 sec between batches (increased for better rate limit handling)
const FETCH_TIMEOUT = 40000; // 40 sec timeout per request (default)
const LARGE_COUNTRY_TIMEOUT = 90000; // 90 sec timeout for large countries
const RETRY_LIMIT = 4; // 4 retries for better reliability
const PEOPLE_LIMIT = 50; // Fetch top 50 people per country

// Large countries that may need special handling
const LARGE_COUNTRIES = ['USA', 'UK', 'China', 'India', 'Russia', 'Germany', 'France', 'Japan', 'Italy', 'Brazil', 'Canada', 'Australia', 'Spain', 'Mexico', 'Indonesia', 'Pakistan', 'Bangladesh', 'Nigeria', 'Philippines', 'Vietnam', 'Turkey', 'Iran', 'Thailand', 'South Korea', 'Egypt', 'Poland', 'Ukraine', 'Argentina', 'Colombia', 'South Africa'];

function buildQuery(countryCode, isLargeCountry = false) {
  // For large countries, add minimum sitelinks filter to reduce dataset size
  // This makes queries much faster by filtering out less famous people upfront
  const minSitelinksFilter = isLargeCountry ? 'FILTER(?sitelinks >= 50)' : '';

  // Simplified query for large countries - remove some optional fields to speed up
  if (isLargeCountry) {
    return `
      SELECT DISTINCT ?person ?personLabel ?image ?sitelinks ?birthYear ?deathYear 
             (SAMPLE(?occupationLabel) AS ?occupation) 
      WHERE {
        ?person wdt:P31 wd:Q5;
                wdt:P27 wd:${countryCode};
                wdt:P18 ?image;
                wikibase:sitelinks ?sitelinks.
        ${minSitelinksFilter}
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

  // Standard query for smaller countries
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
    LIMIT ${PEOPLE_LIMIT}
  `;
}

async function fetchWithTimeout(query, countryName, retries = RETRY_LIMIT, isLargeCountry = false) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const timeout = isLargeCountry ? LARGE_COUNTRY_TIMEOUT : FETCH_TIMEOUT;

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
        setTimeout(() => reject(new Error('Timeout')), timeout)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.status === 429) {
        if (attempt < retries) {
          // Exponential backoff: 15s, 30s, 45s, 60s
          const wait = Math.min(15000 * attempt, 60000);
          console.log(`   ⏳ Rate limit (${countryName}), wait ${wait / 1000}s (attempt ${attempt}/${retries})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error('Rate limited');
      }

      if (response.status >= 500 && response.status < 600) {
        // Server error - retry with exponential backoff
        if (attempt < retries) {
          const wait = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
          console.log(`   ⚠️  Server error ${response.status} (${countryName}), retry ${attempt}/${retries} (waiting ${wait / 1000}s)`);
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
        if (attempt < retries) {
          // Exponential backoff for timeouts
          const retryDelay = Math.min(5000 * Math.pow(2, attempt - 1), 20000);
          console.log(`   ⏱️  Timeout (${countryName}), retry ${attempt}/${retries} (waiting ${retryDelay / 1000}s)`);
          await new Promise(r => setTimeout(r, retryDelay));
          continue;
        }
        throw error;
      }

      // Network errors - retry with exponential backoff
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('fetch')) {
        if (attempt < retries) {
          const retryDelay = Math.min(3000 * Math.pow(2, attempt - 1), 15000);
          console.log(`   🔄 Network error (${countryName}), retry ${attempt}/${retries} (waiting ${retryDelay / 1000}s)`);
          await new Promise(r => setTimeout(r, retryDelay));
          continue;
        }
      }

      if (attempt === retries) {
        throw error;
      }

      // Default retry delay
      const retryDelay = 3000 * attempt;
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
}

function transformResults(sparqlResults) {
  const bindings = sparqlResults.results.bindings;
  return bindings.map((binding, index) => {
    // Extract name, handling cases where personLabel might be a Q code
    let name = binding.personLabel?.value || 'Unknown';

    // If name is a Wikidata Q code (starts with Q followed by numbers), try to extract from URL
    if (name && name.match(/^Q\d+$/)) {
      // Try to get name from person URL if available
      const personUrl = binding.person?.value;
      if (personUrl) {
        const qCodeMatch = personUrl.match(/\/(Q\d+)$/);
        if (qCodeMatch) {
          name = `Unknown (${qCodeMatch[1]})`;
        } else {
          name = `Unknown (${name})`;
        }
      } else {
        name = `Unknown (${name})`;
      }
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

async function generateCountryData(country, index, total, forceRegenerate = false) {
  const filename = `${country.name.replace(/\s+/g, '_')}.json`;
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const outputPath = path.join(outputDir, filename);
  const isLargeCountry = LARGE_COUNTRIES.includes(country.name);

  // Check if file exists and has enough people and matching countryCode
  if (fs.existsSync(outputPath) && !forceRegenerate) {
    try {
      const existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      // Verification: Check if this file actually belongs to this country code
      // This prevents issues where country names were swapped or misaligned
      const codeMismatch = existingData.countryCode && existingData.countryCode !== country.code;

      if (codeMismatch) {
        console.log(`   ⚠️  [${index + 1}/${total}] ${country.name} (mismatch detected: file has ${existingData.countryCode}, expected ${country.code}) - REGENERATING`);
      } else if (existingData.people && existingData.people.length >= PEOPLE_LIMIT) {
        console.log(`   ⏭️  [${index + 1}/${total}] ${country.name} (skipped - has ${existingData.people.length} people)`);
        return { success: true, country: country.name, skipped: true };
      } else if (existingData.people && existingData.people.length > 0) {
        console.log(`   🔄 [${index + 1}/${total}] ${country.name} (regenerating - has only ${existingData.people.length} people)`);
      } else {
        console.log(`   🔄 [${index + 1}/${total}] ${country.name} (regenerating - invalid data)`);
      }
    } catch (e) {
      console.log(`   🔄 [${index + 1}/${total}] ${country.name} (regenerating - file corrupted)`);
    }
  }

  const startTime = Date.now();

  try {
    const query = buildQuery(country.code, isLargeCountry);
    const sparqlResults = await fetchWithTimeout(query, country.name, RETRY_LIMIT, isLargeCountry);
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
    const hasLargeCountry = batch.some(c => LARGE_COUNTRIES.includes(c.name));
    const batchDelay = hasLargeCountry ? BATCH_DELAY * 1.5 : BATCH_DELAY; // Longer delay if batch has large country

    console.log(`📦 Batch ${batchNum}/${Math.ceil(COUNTRIES.length / BATCH_SIZE)}: ${batch.map(c => c.name).join(', ')}`);

    const promises = batch.map((c, bi) => generateCountryData(c, i + bi, COUNTRIES.length));
    const batchResults = await Promise.allSettled(promises);

    // Convert Promise.allSettled results to our format
    const formattedResults = batchResults.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { success: false, country: batch[idx].name, error: result.reason?.message || 'Unknown error' };
      }
    });

    results.push(...formattedResults);

    const done = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    console.log(`   📊 Progress: ${done}/${COUNTRIES.length}`);
    if (failed.length > 0) {
      console.log(`   ⚠️  Failed so far: ${failed.map(f => f.country).join(', ')}`);
    }
    console.log('');

    const anyProcessed = formattedResults.some(r => r.success && !r.skipped);

    if (i + BATCH_SIZE < COUNTRIES.length && anyProcessed) {
      await new Promise(r => setTimeout(r, batchDelay));
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
