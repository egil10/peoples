
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

async function main() {
    const query = `
    SELECT ?label ?code WHERE {
      ?country wdt:P31 wd:Q6256. 
      ?country rdfs:label ?label.
      BIND(REPLACE(STR(?country), ".*(Q\\\\d+)", "$1") AS ?code)
      FILTER(LANG(?label) = "en")
    }
    `;
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

    console.log('Fetching master list from Wikidata...');
    const response = await fetch(url, { headers: { 'Accept': 'application/sparql-results+json' } });
    const data = await response.json();
    const master = {};
    data.results.bindings.forEach(b => {
        master[b.label.value.toLowerCase()] = b.code.value;
    });

    // Special mappings for the names we use
    master['usa'] = 'Q30';
    master['uk'] = 'Q145';
    master['uae'] = 'Q878';
    master['drc'] = 'Q974';
    master['south korea'] = 'Q884';
    master['north korea'] = 'Q423';
    master['czech republic'] = 'Q213';
    master['taiwan'] = 'Q865';
    master['vatican city'] = 'Q237';
    master['ivory coast'] = 'Q1008';
    master['bosnia'] = 'Q225';

    const dataPipelinePath = path.join(__dirname, 'data-pipeline.js');
    const content = fs.readFileSync(dataPipelinePath, 'utf-8');

    const match = content.match(/const COUNTRIES = \[([\s\S]*?)\];/);
    const countriesText = match[1];
    const lines = countriesText.split('\n');

    const newLines = lines.map(line => {
        const itemMatch = line.match(/{ code: '(Q\d+)', name: '([^']+)' }/);
        if (itemMatch) {
            const currentCode = itemMatch[1];
            const name = itemMatch[2];
            const correctCode = master[name.toLowerCase()];
            if (correctCode && correctCode !== currentCode) {
                console.log(`Fixing ${name}: ${currentCode} -> ${correctCode}`);
                return line.replace(currentCode, correctCode);
            }
        }
        return line;
    });

    const newContent = content.replace(countriesText, newLines.join('\n'));
    fs.writeFileSync(dataPipelinePath, newContent);
    console.log('Done!');
}

main();
