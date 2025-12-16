/**
 * Test script to fetch YouTube Music home feed and save response
 * Run with: node testHomeFeed.js
 */

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
    'Content-Type': 'application/json',
    'Origin': 'https://music.youtube.com',
};

const WEB_REMIX_CONTEXT = {
    context: {
        client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20250310.01.00',
            originalUrl: 'https://music.youtube.com',
            hl: 'en',
            gl: 'IN'
        }
    }
};

async function fetchHomeFeed() {
    try {
        console.log('🌐 Fetching YouTube Music home feed...');

        const url = `${INNERTUBE_API_URL}/browse?key=${INNERTUBE_API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                ...WEB_REMIX_CONTEXT,
                browseId: 'FEmusic_home'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('✅ Response received successfully');
        console.log(`📊 Data size: ${JSON.stringify(data).length} bytes`);

        // Save to file
        const fs = require('fs');
        const outputFile = 'ytmusic_homefeed_response.json';

        fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

        console.log(`💾 Response saved to: ${outputFile}`);

        // Print basic structure info
        if (data.contents?.singleColumnBrowseResultsRenderer?.tabs) {
            const tabs = data.contents.singleColumnBrowseResultsRenderer.tabs;
            console.log(`\n📋 Found ${tabs.length} tabs`);

            if (tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents) {
                const sections = tabs[0].tabRenderer.content.sectionListRenderer.contents;
                console.log(`📦 Found ${sections.length} sections:`);

                sections.forEach((section, idx) => {
                    if (section.musicCarouselShelfRenderer) {
                        const title = section.musicCarouselShelfRenderer.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || 'Unknown';
                        const itemCount = section.musicCarouselShelfRenderer.contents?.length || 0;
                        console.log(`  ${idx + 1}. "${title}" - ${itemCount} items`);
                    }
                });
            }
        }

        console.log('\n✅ Done! Check the output file for full response.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
fetchHomeFeed();
