/**
 * Add Wikipedia Links to Existing Data
 * 
 * This script enriches the existing people data with English Wikipedia links
 * by querying Wikidata for each person's sitelink to enwiki.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const BATCH_SIZE = 5; // Process 5 people at once for efficiency
const REQUEST_DELAY = 200; // 200ms between batches to avoid rate limiting
const COUNTRY_DELAY = 1000; // 1 second between countries

/**
 * Extract Wikidata Q-code from URL
 */
function extractQCode(wikidataUrl) {
    const match = wikidataUrl.match(/\/(Q\d+)$/);
    return match ? match[1] : null;
}

/**
 * Fetch Wikipedia links for a batch of Wikidata Q-codes
 * Uses the Wikidata API to get sitelinks
 */
async function fetchWikipediaLinks(qCodes) {
    if (qCodes.length === 0) return {};

    const url = 'https://www.wikidata.org/w/api.php';
    const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: qCodes.join('|'),
        props: 'sitelinks',
        sitefilter: 'enwiki', // Only get English Wikipedia
        format: 'json'
    });

    try {
        const response = await fetch(`${url}?${params}`, {
            headers: {
                'User-Agent': 'WikidataQuizApp/2.0'
            }
        });

        if (!response.ok) {
            console.error(`   ⚠️  API error: ${response.status}`);
            return {};
        }

        const data = await response.json();
        const results = {};

        // Extract Wikipedia URLs from the response
        for (const [qCode, entity] of Object.entries(data.entities || {})) {
            if (entity.sitelinks && entity.sitelinks.enwiki) {
                const title = entity.sitelinks.enwiki.title;
                // Construct the Wikipedia URL
                results[qCode] = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
            }
        }

        return results;
    } catch (error) {
        console.error(`   ❌ Fetch error: ${error.message}`);
        return {};
    }
}

/**
 * Process a single country file
 */
async function processCountryFile(filename) {
    const filePath = path.join(DATA_DIR, filename);

    // Skip non-JSON files or index
    if (!filename.endsWith('.json') || filename === 'index.json') {
        return { skipped: true };
    }

    try {
        // Read existing data
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (!data.people || data.people.length === 0) {
            console.log(`   ⏭️  ${data.country}: No people found`);
            return { skipped: true };
        }

        // Check if Wikipedia links already exist
        const hasWikipedia = data.people.some(p => p.wikipediaUrl);
        if (hasWikipedia && !process.argv.includes('--force')) {
            console.log(`   ⏭️  ${data.country}: Already has Wikipedia links (use --force to update)`);
            return { skipped: true, country: data.country };
        }

        console.log(`   🔄 ${data.country}: Processing ${data.people.length} people...`);

        let updatedCount = 0;
        let notFoundCount = 0;

        // Process people in batches
        for (let i = 0; i < data.people.length; i += BATCH_SIZE) {
            const batch = data.people.slice(i, Math.min(i + BATCH_SIZE, data.people.length));

            // Extract Q-codes from this batch
            const qCodes = batch
                .map(person => extractQCode(person.wikidataUrl))
                .filter(qCode => qCode !== null);

            if (qCodes.length === 0) continue;

            // Fetch Wikipedia links for this batch
            const wikipediaLinks = await fetchWikipediaLinks(qCodes);

            // Update people with Wikipedia links
            batch.forEach(person => {
                const qCode = extractQCode(person.wikidataUrl);
                if (qCode && wikipediaLinks[qCode]) {
                    person.wikipediaUrl = wikipediaLinks[qCode];
                    updatedCount++;
                } else {
                    // No Wikipedia page found
                    person.wikipediaUrl = null;
                    notFoundCount++;
                }
            });

            // Small delay between batches
            if (i + BATCH_SIZE < data.people.length) {
                await new Promise(r => setTimeout(r, REQUEST_DELAY));
            }
        }

        // Update the generated timestamp
        data.updated = new Date().toISOString();
        data.wikipediaLinksAdded = true;

        // Write updated data back to file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        console.log(`   ✅ ${data.country}: Added ${updatedCount} links, ${notFoundCount} not found`);

        return {
            success: true,
            country: data.country,
            updated: updatedCount,
            notFound: notFoundCount
        };

    } catch (error) {
        console.error(`   ❌ ${filename}: ${error.message}`);
        return {
            success: false,
            country: filename,
            error: error.message
        };
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n📚 Adding Wikipedia Links to Existing Data');
    console.log('═'.repeat(60));
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Batch size: ${BATCH_SIZE} | Request delay: ${REQUEST_DELAY}ms\n`);

    // Get all JSON files in the data directory
    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .sort();

    console.log(`Found ${files.length} country files\n`);

    const results = [];
    let totalUpdated = 0;
    let totalNotFound = 0;

    // Process files sequentially to avoid rate limiting
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[${i + 1}/${files.length}] Processing ${file}...`);

        const result = await processCountryFile(file);
        results.push(result);

        if (result.success) {
            totalUpdated += result.updated || 0;
            totalNotFound += result.notFound || 0;
        }

        // Delay between countries
        if (i < files.length - 1) {
            await new Promise(r => setTimeout(r, COUNTRY_DELAY));
        }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success && !r.skipped).length;

    console.log('\n' + '═'.repeat(60));
    console.log('✨ Complete!');
    console.log(`   ✅ Processed: ${successful} countries`);
    console.log(`   ⏭️  Skipped: ${skipped} countries`);
    console.log(`   ❌ Failed: ${failed} countries`);
    console.log(`   🔗 Wikipedia links added: ${totalUpdated}`);
    console.log(`   ❓ Not found: ${totalNotFound}`);
    console.log('');

    if (failed > 0) {
        console.log('Failed countries:');
        results.filter(r => !r.success && !r.skipped)
            .forEach(r => console.log(`   - ${r.country}: ${r.error}`));
    }
}

main().catch(console.error);
