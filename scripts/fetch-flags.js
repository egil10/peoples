/**
 * Fetch Country Flags from Wikidata
 * Adds flag image URLs to existing country JSON files
 * Automatically uses all countries from data-pipeline.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Import countries from data-pipeline.js
const dataPipelinePath = path.join(__dirname, 'data-pipeline.js');
const dataPipelineContent = fs.readFileSync(dataPipelinePath, 'utf-8');
const countriesMatch = dataPipelineContent.match(/const COUNTRIES = \[([\s\S]*?)\];/);

if (!countriesMatch) {
    console.error('❌ Could not find COUNTRIES array in data-pipeline.js');
    process.exit(1);
}

// Parse the COUNTRIES array
const countriesCode = countriesMatch[1];
const countryEntries = countriesCode.match(/{ code: 'Q\d+', name: '[^']+' }/g);

if (!countryEntries) {
    console.error('❌ Could not parse countries from data-pipeline.js');
    process.exit(1);
}

// Build COUNTRY_CODES map from the COUNTRIES array
const COUNTRY_CODES = {};
countryEntries.forEach(entry => {
    const codeMatch = entry.match(/code: '(Q\d+)'/);
    const nameMatch = entry.match(/name: '([^']+)'/);
    if (codeMatch && nameMatch) {
        COUNTRY_CODES[nameMatch[1]] = codeMatch[1];
    }
});

console.log(`📋 Loaded ${Object.keys(COUNTRY_CODES).length} countries from data-pipeline.js\n`);

function buildFlagQuery(countryCode) {
    return `
    SELECT ?flag WHERE {
      wd:${countryCode} wdt:P41 ?flag.
    }
    LIMIT 1
  `;
}

async function fetchFlag(countryName, countryCode) {
    try {
        const query = buildFlagQuery(countryCode);
        const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WikidataQuizApp/2.0',
                'Accept': 'application/sparql-results+json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const bindings = data.results.bindings;

        if (bindings.length > 0) {
            return bindings[0].flag.value;
        }

        return null;
    } catch (error) {
        console.error(`   ❌ ${countryName}: ${error.message}`);
        return null;
    }
}

async function updateCountryFile(countryName, flagUrl) {
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const filename = `${countryName.replace(/\s+/g, '_')}.json`;
    const filepath = path.join(dataDir, filename);

    if (!fs.existsSync(filepath)) {
        console.log(`   ⏭️  ${countryName} - file not found, skipping`);
        return false;
    }

    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const data = JSON.parse(content);

        data.flag = flagUrl;

        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`   ❌ ${countryName}: Failed to update file - ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('\n🏴 Fetching Country Flags from Wikidata\n');
    console.log('═'.repeat(50));

    let success = 0;
    let failed = 0;

    for (const [countryName, countryCode] of Object.entries(COUNTRY_CODES)) {
        const flagUrl = await fetchFlag(countryName, countryCode);

        if (flagUrl) {
            const updated = await updateCountryFile(countryName, flagUrl);
            if (updated) {
                console.log(`   ✅ ${countryName}`);
                success++;
            } else {
                failed++;
            }
        } else {
            console.log(`   ⚠️  ${countryName} - no flag found`);
            failed++;
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`✨ Complete!`);
    console.log(`   ✅ Success: ${success}`);
    console.log(`   ❌ Failed: ${failed}\n`);
}

main().catch(console.error);
