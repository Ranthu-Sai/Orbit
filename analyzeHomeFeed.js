const fs = require('fs');

const data = JSON.parse(fs.readFileSync('ytmusic_homefeed_response.json', 'utf8'));

const tabs = data.contents.singleColumnBrowseResultsRenderer.tabs;
const sections = tabs[0].tabRenderer.content.sectionListRenderer.contents;

console.log('YouTube Music Home Feed Content Analysis');
console.log('=========================================\n');

sections.forEach((section, idx) => {
    if (section.musicCarouselShelfRenderer) {
        const shelf = section.musicCarouselShelfRenderer;
        const title = shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || 'Unknown';
        const items = shelf.contents || [];

        console.log(`Section ${idx + 1}: "${title}" (${items.length} items)`);

        const types = {};

        items.forEach(item => {
            if (item.musicResponsiveListItemRenderer) {
                types['SONG'] = (types['SONG'] || 0) + 1;
            } else if (item.musicTwoRowItemRenderer) {
                const renderer = item.musicTwoRowItemRenderer;
                const pageType = renderer.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;

                if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                    types['ALBUM'] = (types['ALBUM'] || 0) + 1;
                } else if (pageType === 'MUSIC_PAGE_TYPE_PLAYLIST') {
                    types['PLAYLIST'] = (types['PLAYLIST'] || 0) + 1;
                } else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                    types['ARTIST'] = (types['ARTIST'] || 0) + 1;
                } else {
                    types['OTHER'] = (types['OTHER'] || 0) + 1;
                }
            }
        });

        console.log('  Content types:');
        Object.keys(types).forEach(type => {
            console.log(`    - ${type}: ${types[type]}`);
        });
        console.log('');
    }
});

console.log('\n== SUMMARY ==');
console.log('The home feed in your region (India) returns:');
console.log('- Songs in "Quick picks" section');
console.log('- Playlists in "Trending community playlists" section');
console.log('- NO ALBUMS in the home feed');
console.log('\nThis is why we switched to using search instead!');
