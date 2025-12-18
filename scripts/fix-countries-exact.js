
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

async function fetchCorrectCode(name) {
    const query = `
    SELECT ?country WHERE {
      ?country rdfs:label "${name}"@en.
      ?country wdt:P31/wdt:P279* wd:Q6256. 
    }
    LIMIT 1
    `;
    // Q6256 is "country"
    // Alternatively Q3624078 for sovereign state
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
        return data.results.bindings[0]?.country?.value.split('/').pop() || null;
    } catch (e) {
        return null;
    }
}

async function main() {
    const dataPipelinePath = path.join(__dirname, 'data-pipeline.js');
    const content = fs.readFileSync(dataPipelinePath, 'utf-8');

    // Extract the COUNTRIES array
    const match = content.match(/const COUNTRIES = \[([\s\S]*?)\];/);
    if (!match) return;

    const countriesText = match[1];
    const lines = countriesText.split('\n');

    console.log('Verifying all countries with exact name search...');

    const newLines = [];
    for (const line of lines) {
        const itemMatch = line.match(/{ code: '(Q\d+)', name: '([^']+)' }/);
        if (itemMatch) {
            const currentCode = itemMatch[1];
            const name = itemMatch[2];

            // Map common abbreviations to full names for Wikidata
            const searchName = {
                'USA': 'United States of America',
                'UK': 'United Kingdom',
                'UAE': 'United Arab Emirates',
                'DRC': 'Democratic Republic of the Congo',
                'Bosnia': 'Bosnia and Herzegovina',
                'Czech Republic': 'Czechia',
                'Ivory Coast': 'Ivory Coast'
            }[name] || name;

            const correctCode = await fetchCorrectCode(searchName);

            if (correctCode && correctCode !== currentCode) {
                console.log(`✅ Fixed ${name}: ${currentCode} -> ${correctCode}`);
                newLines.push(line.replace(currentCode, correctCode));
            } else {
                if (!correctCode) {
                    console.log(`⚠️  Could not find code for ${name}`);
                }
                newLines.push(line);
            }
            await new Promise(r => setTimeout(r, 200)); // Rate limit
        } else {
            newLines.push(line);
        }
    }

    const newContent = content.replace(countriesText, newLines.join('\n'));
    fs.writeFileSync(dataPipelinePath, newContent);
    console.log('\nFinished fixing data-pipeline.js');
}

main();
