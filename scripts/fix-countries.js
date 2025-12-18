
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

async function fetchCorrectCountries() {
    const query = `
    SELECT ?country ?label WHERE {
      ?country wdt:P31 wd:Q3624078.
      ?country rdfs:label ?label.
      FILTER(LANG(?label) = "en")
    }
    `;
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WikidataQuizApp/2.0',
                'Accept': 'application/sparql-results+json'
            }
        });
        if (!response.ok) throw new Error('Query failed');
        const data = await response.json();
        return data.results.bindings.map(b => ({
            code: b.country.value.split('/').pop(),
            name: b.label.value
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function main() {
    const correctOnes = await fetchCorrectCountries();
    if (correctOnes.length === 0) return;

    const dataPipelinePath = path.join(__dirname, 'data-pipeline.js');
    const content = fs.readFileSync(dataPipelinePath, 'utf-8');

    // Extract the COUNTRIES array
    const match = content.match(/const COUNTRIES = \[([\s\S]*?)\];/);
    if (!match) return;

    const countriesText = match[1];
    const regex = /{ code: '(Q\d+)', name: '([^']+)' }/g;

    let updatedText = countriesText;

    // Create a map for quick lookup
    const nameToCode = {};
    correctOnes.forEach(c => {
        nameToCode[c.name.toLowerCase()] = c.code;
    });

    // Special cases / variations
    nameToCode['usa'] = 'Q30';
    nameToCode['uk'] = 'Q145';
    nameToCode['uae'] = 'Q878';
    nameToCode['drc'] = 'Q801'; // Wait, DRC is Q974. Israel is Q801. 
    // Let's be careful.

    const manualFixes = {
        'USA': 'Q30',
        'UK': 'Q145',
        'DRC': 'Q974',
        'UAE': 'Q878',
        'South Korea': 'Q884',
        'North Korea': 'Q423',
        'Czech Republic': 'Q213',
        'Bosnia': 'Q225',
        'Vatican City': 'Q237',
        'Taiwan': 'Q865',
        'Trinidad and Tobago': 'Q734',
        'Antigua and Barbuda': 'Q781',
        'Saint Kitts and Nevis': 'Q763',
        'Saint Lucia': 'Q760',
        'Saint Vincent and the Grenadines': 'Q757',
        'Guinea-Bissau': 'Q1007',
        'Equatorial Guinea': 'Q1013',
        'Republic of the Congo': 'Q1015',
        'Central African Republic': 'Q1017',
        'São Tomé and Príncipe': 'Q1018',
        'Cape Verde': 'Q1034',
        'Papua New Guinea': 'Q691',
        'Marshall Islands': 'Q709',
        'Solomon Islands': 'Q685',
        'East Timor': 'Q574',
        'Ivory Coast': 'Q1008',
        'Eswatini': 'Q1023'
    };

    let m;
    const lines = countriesText.split('\n');
    const newLines = lines.map(line => {
        const itemMatch = line.match(/{ code: '(Q\d+)', name: '([^']+)' }/);
        if (itemMatch) {
            const currentCode = itemMatch[1];
            const name = itemMatch[2];

            let correctCode = manualFixes[name];
            if (!correctCode) {
                // Try exact match
                correctCode = nameToCode[name.toLowerCase()];
            }
            if (!correctCode) {
                // Try fuzzy match or search in correctOnes
                const found = correctOnes.find(c => c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase()));
                if (found) correctCode = found.code;
            }

            if (correctCode && correctCode !== currentCode) {
                console.log(`Fixing ${name}: ${currentCode} -> ${correctCode}`);
                return line.replace(currentCode, correctCode);
            }
        }
        return line;
    });

    const newContent = content.replace(countriesText, newLines.join('\n'));
    fs.writeFileSync(dataPipelinePath, newContent);
    console.log('Finished fixing data-pipeline.js');
}

main();
