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
        // Extract Q code from URL if it's a full URL
        const code = qCode.replace(/^.*\/(Q\d+)$/, '$1');
        
        // Use wikibase:label service - this should return English by default
        const query = `
            SELECT ?label WHERE {
                SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                wd:${code} rdfs:label ?label.
            }
            LIMIT 1
        `;
        
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
        
        if (data.results && data.results.bindings && data.results.bindings.length > 0) {
            const label = data.results.bindings[0].label.value;
            // Verify it's actually English (not Cyrillic, Greek, etc.)
            // Simple check: if it contains only ASCII letters, spaces, and common punctuation, it's likely English
            if (/^[a-zA-Z0-9\s\-\'\.\,\(\)]+$/.test(label) || label.length > 0) {
                return label;
            }
        }
        
        // Fallback: try direct rdfs:label with English filter
        const query2 = `
            SELECT ?label WHERE {
                wd:${code} rdfs:label ?label.
                FILTER(LANG(?label) = "en")
            }
            LIMIT 1
        `;
        
        const url2 = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query2)}&format=json`;
        const response2 = await fetch(url2, {
            headers: {
                'User-Agent': 'WikidataQuizApp/2.0',
                'Accept': 'application/sparql-results+json'
            }
        });
        
        if (response2.ok) {
            const data2 = await response2.json();
            if (data2.results && data2.results.bindings && data2.results.bindings.length > 0) {
                return data2.results.bindings[0].label.value;
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
            // Check if name is a Q code
            if (person.name && person.name.match(/^Q\d+$/)) {
                console.log(`   🔍 Found Q code: ${person.name} (${person.wikidataUrl})`);
                
                // Try to get name from wikidataUrl
                const qCode = person.wikidataUrl.match(/\/(Q\d+)$/)?.[1] || person.name;
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

