/**
 * Fix Q Code Names in JSON Files
 * Fetches proper names for entries that have Q codes instead of names
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

async function fetchNameFromQCode(qCode) {
    try {
        const code = qCode.replace(/^.*\/(Q\d+)$/, '$1');
        const latinRegex = /^[a-zA-Z0-9\s\-\'\.\,\(\)\"\/\\!\?\&\[\]\u00C0-\u024F\u1E00-\u1EFF]+$/;

        // Strategy 1: Primary English Label
        const queryEn = `
            SELECT ?label WHERE {
                wd:${code} rdfs:label ?label.
                FILTER(LANG(?label) = "en")
            }
            LIMIT 1
        `;

        let response = await fetch(`${SPARQL_ENDPOINT}?query=${encodeURIComponent(queryEn)}&format=json`, {
            headers: { 'User-Agent': 'WikidataQuizApp/2.0', 'Accept': 'application/sparql-results+json' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.results?.bindings?.[0]?.label?.value) {
                const label = data.results.bindings[0].label.value;
                if (latinRegex.test(label)) return label;
            }
        }

        // Strategy 2: Any Latin Label
        const queryAll = `
            SELECT ?label WHERE {
                wd:${code} rdfs:label ?label.
            }
            LIMIT 50
        `;

        response = await fetch(`${SPARQL_ENDPOINT}?query=${encodeURIComponent(queryAll)}&format=json`, {
            headers: { 'User-Agent': 'WikidataQuizApp/2.0', 'Accept': 'application/sparql-results+json' }
        });

        if (response.ok) {
            const data = await response.json();
            const bindings = data.results?.bindings || [];
            for (const b of bindings) {
                const label = b.label.value;
                if (latinRegex.test(label)) return label;
            }
        }

        // Strategy 3: Check Aliases
        const queryAlias = `
            SELECT ?label WHERE {
                wd:${code} skos:altLabel ?label.
            }
            LIMIT 20
        `;
        response = await fetch(`${SPARQL_ENDPOINT}?query=${encodeURIComponent(queryAlias)}&format=json`, {
            headers: { 'User-Agent': 'WikidataQuizApp/2.0', 'Accept': 'application/sparql-results+json' }
        });
        if (response.ok) {
            const data = await response.json();
            const bindings = data.results?.bindings || [];
            for (const b of bindings) {
                const label = b.label.value;
                if (latinRegex.test(label)) return label;
            }
        }

        return null;
    } catch (error) {
        console.error(`   ❌ Error fetching name for ${qCode}: ${error.message}`);
        return null;
    }
}

function normalizeForAnswerKey(text) {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fixCountryFile(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const data = JSON.parse(content);

        let fixed = false;
        let fixedCount = 0;

        for (const person of data.people) {
            // Latin check range (same as fetchNameFromQCode)
            const latinRegex = /^[a-zA-Z0-9\s\-\'\.\,\(\)\"\/\\!\?\&\[\]\u00C0-\u024F\u1E00-\u1EFF]+$/;

            // Check if name is a Q code, "Unknown (Q...)", or contains non-Latin characters
            const isQCode = person.name && (person.name.match(/^Q\d+$/) || person.name.match(/^Unknown \((Q\d+)\)$/));
            const isNonLatin = person.name && !latinRegex.test(person.name);

            if (isQCode || isNonLatin) {
                const qCodeMatch = person.name.match(/Q\d+/);
                const qCodeFromName = qCodeMatch ? qCodeMatch[0] : null;
                const qCodeFromUrl = person.wikidataUrl ? (person.wikidataUrl.match(/\/(Q\d+)$/)?.[1]) : null;
                const qCode = qCodeFromName || qCodeFromUrl;

                if (!qCode) {
                    console.log(`   ⚠️  No Q code found for ${person.name}`);
                    continue;
                }

                console.log(`   🔍 Found target: ${person.name} (${qCode})`);

                const properName = await fetchNameFromQCode(qCode);

                if (properName) {
                    console.log(`   ✅ Fixed: ${person.name} → ${properName}`);
                    person.name = properName;
                    person.answerKey = normalizeForAnswerKey(properName);
                    fixed = true;
                    fixedCount++;
                } else {
                    console.log(`   ⚠️  Could not fetch name for ${person.name}`);
                }

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 300));
            }
        }

        if (fixed) {
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`   ✨ Fixed ${fixedCount} entries in ${path.basename(filepath)}\n`);
            return fixedCount;
        }

        return 0;
    } catch (error) {
        console.error(`   ❌ Error processing ${filepath}: ${error.message}`);
        return 0;
    }
}

async function main() {
    console.log('\n🔧 Fixing Q Code Names in Data Files\n');
    console.log('═'.repeat(50));

    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json');

    let totalFixed = 0;

    for (const file of files) {
        const filepath = path.join(dataDir, file);
        console.log(`\n📄 Processing ${file}...`);
        const fixed = await fixCountryFile(filepath);
        totalFixed += fixed;
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`✨ Complete! Fixed ${totalFixed} entries total\n`);
}

main().catch(console.error);

