
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

async function fetchLabel(qCode) {
    const query = `
    SELECT ?label WHERE {
      wd:${qCode} rdfs:label ?label.
      FILTER(LANG(?label) = "en")
    }
    LIMIT 1
  `;
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WikidataQuizApp/2.0',
                'Accept': 'application/sparql-results+json'
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.results.bindings[0]?.label?.value || null;
    } catch (e) {
        return null;
    }
}

async function main() {
    const dataPipelinePath = path.join(__dirname, 'data-pipeline.js');
    const content = fs.readFileSync(dataPipelinePath, 'utf-8');

    // Extract the COUNTRIES array
    const match = content.match(/const COUNTRIES = \[([\s\S]*?)\];/);
    if (!match) {
        console.error('Could not find COUNTRIES array');
        return;
    }

    const countriesText = match[1];
    const entries = [];
    const regex = /{ code: '(Q\d+)', name: '([^']+)' }/g;
    let m;
    while ((m = regex.exec(countriesText)) !== null) {
        entries.push({ code: m[1], name: m[2] });
    }

    console.log(`Verifying ${entries.length} countries...\n`);

    const errors = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        process.stdout.write(`[${i + 1}/${entries.length}] Checking ${entry.name} (${entry.code})... `);

        const label = await fetchLabel(entry.code);

        if (!label) {
            console.log('❌ NOT FOUND');
            errors.push({ ...entry, actual: 'NOT FOUND' });
        } else if (label.toLowerCase() !== entry.name.toLowerCase()) {
            // Some names might be slightly different (e.g. "USA" vs "United States of America")
            // But "Zambia" vs "Senegal" is a clear error
            const isMajorMismatch = !label.toLowerCase().includes(entry.name.toLowerCase()) &&
                !entry.name.toLowerCase().includes(label.toLowerCase());

            if (isMajorMismatch) {
                console.log(`❌ MISMATCH: ${label}`);
                errors.push({ ...entry, actual: label });
            } else {
                console.log(`✅ OK (Label: ${label})`);
            }
        } else {
            console.log('✅ OK');
        }

        // Small delay
        await new Promise(r => setTimeout(r, 100));
    }

    if (errors.length > 0) {
        console.log('\n❌ Found the following mismatches:');
        errors.forEach(err => {
            console.log(`  - ${err.name} (${err.code}) is actually ${err.actual}`);
        });
    } else {
        console.log('\n✅ No major mismatches found!');
    }
}

main();
