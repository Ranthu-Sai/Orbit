const fs = require('fs');

const data = JSON.parse(fs.readFileSync('ytmusic_homefeed_response.json', 'utf8'));

const tabs = data.contents.singleColumnBrowseResultsRenderer.tabs;
const sections = tabs[0].tabRenderer.content.sectionListRenderer.contents;
sections.forEach((section, idx) => {
    if (section.musicCarouselShelfRenderer) {
        const shelf = section.musicCarouselShelfRenderer;
        const title = shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || 'Unknown';
        const items = shelf.contents || [];

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
        Object.keys(types).forEach(type => {
        });
    }
});
