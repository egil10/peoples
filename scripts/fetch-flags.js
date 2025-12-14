/**
 * Fetch Country Flags from Wikidata
 * Adds flag image URLs to existing country JSON files
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Map country names to their Wikidata IDs
const COUNTRY_CODES = {
    'USA': 'Q30',
    'China': 'Q148',
    'India': 'Q668',
    'Brazil': 'Q155',
    'Russia': 'Q159',
    'Germany': 'Q183',
    'France': 'Q142',
    'UK': 'Q145',
    'Japan': 'Q17',
    'Italy': 'Q38',
    'Canada': 'Q16',
    'Australia': 'Q408',
    'South Korea': 'Q884',
    'Mexico': 'Q96',
    'Spain': 'Q29',
    'Dominican Republic': 'Q786',
    'Ukraine': 'Q212',
    'Egypt': 'Q79',
    'Turkey': 'Q43',
    'Chile': 'Q298',
    'Norway': 'Q20',
    'Sweden': 'Q34',
    'Denmark': 'Q35',
    'Finland': 'Q33',
    'Poland': 'Q36',
    'Netherlands': 'Q55',
    'Belgium': 'Q31',
    'Switzerland': 'Q39',
    'Austria': 'Q40',
    'Lithuania': 'Q37',
    'Latvia': 'Q211',
    'Estonia': 'Q191',
    'Ireland': 'Q27',
    'Iceland': 'Q189',
    'Portugal': 'Q45',
    'Greece': 'Q41',
    'Croatia': 'Q224',
    'Slovenia': 'Q215',
    'Czech Republic': 'Q213',
    'Slovakia': 'Q214',
    'Hungary': 'Q28',
    'Romania': 'Q218',
    'Bulgaria': 'Q219',
    'North Macedonia': 'Q221',
    'Albania': 'Q222',
    'Cyprus': 'Q229',
    'Malta': 'Q233',
    'Montenegro': 'Q236',
    'Serbia': 'Q403',
    'Bosnia': 'Q225',
    'Taiwan': 'Q865',
    'Malaysia': 'Q833',
    'Singapore': 'Q334',
    'Indonesia': 'Q252',
    'Philippines': 'Q928',
    'Thailand': 'Q869',
    'Vietnam': 'Q881',
    'Pakistan': 'Q843',
    'Lebanon': 'Q822',
    'Iraq': 'Q796',
    'Israel': 'Q801',
    'Syria': 'Q858',
    'Jordan': 'Q810',
    'Saudi Arabia': 'Q851',
    'UAE': 'Q878',
    'Qatar': 'Q846',
    'Kuwait': 'Q817',
    'Oman': 'Q842',
    'Bahrain': 'Q398',
    'Afghanistan': 'Q889',
    'Ethiopia': 'Q115',
    'Laos': 'Q819',
    'Cambodia': 'Q424',
    'Myanmar': 'Q836',
    'Sri Lanka': 'Q854',
    'Tajikistan': 'Q863',
    'Kazakhstan': 'Q232',
    'Uzbekistan': 'Q265',
    'Kyrgyzstan': 'Q813',
    'Turkmenistan': 'Q874',
    'North Korea': 'Q423',
    'Mongolia': 'Q711',
    'Iran': 'Q794',
    'Bhutan': 'Q967',
    'Nepal': 'Q837',
    'Argentina': 'Q414',
    'Peru': 'Q419',
    'Venezuela': 'Q717',
    'Colombia': 'Q739',
    'Ecuador': 'Q736',
    'Bolivia': 'Q750',
    'Paraguay': 'Q733',
    'Uruguay': 'Q77',
    'Haiti': 'Q790',
    'Jamaica': 'Q766',
    'Cuba': 'Q241',
    'Costa Rica': 'Q800',
    'Guatemala': 'Q774',
    'Honduras': 'Q783',
    'El Salvador': 'Q792',
    'Nicaragua': 'Q811',
    'Panama': 'Q804',
    'South Africa': 'Q258',
    'Nigeria': 'Q1033',
    'Morocco': 'Q1028',
    'Cameroon': 'Q1029',
    'Angola': 'Q916',
    'Kenya': 'Q114',
    'Rwanda': 'Q1037',
    'Mauritius': 'Q1025',
    'Madagascar': 'Q1019',
    'DRC': 'Q974',
    'Uganda': 'Q1036',
    'Malawi': 'Q1020',
    'Sudan': 'Q1049',
    'Somalia': 'Q1045',
    'Tunisia': 'Q948',
    'Algeria': 'Q262',
    'Libya': 'Q1016',
    'New Zealand': 'Q664',
    'Papua New Guinea': 'Q691',
    'Fiji': 'Q712',
    'Samoa': 'Q683'
};

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
