    static parseSearch(data, filter) {
    const results = [];
    try {
        const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
        if (!contents) {
            return [];
        }
        // YouTube wraps results in itemSectionRenderer - need to look inside
        let musicShelfRenderer = null;

        for (const section of contents) {
            const keys = Object.keys(section);
            // Direct musicShelfRenderer
            if (section.musicShelfRenderer) {
                musicShelfRenderer = section.musicShelfRenderer;
                break;
            }

            // Check inside itemSectionRenderer wrapper
            if (section.itemSectionRenderer?.contents) {
                for (const item of section.itemSectionRenderer.contents) {
                    if (item.musicShelfRenderer) {
                        musicShelfRenderer = item.musicShelfRenderer;
                        break;
                    }
                }
            }
            if (musicShelfRenderer) break;
        }

        if (!musicShelfRenderer) {
            return [];
        }
        if (musicShelfRenderer?.contents) {
            musicShelfRenderer.contents.forEach((item, idx) => {
                const parsed = this.parseItem(item);
                if (parsed) {
                    results.push(parsed);
                }
            });
        }
    } catch (e) { console.error('Parse Search Error', e); }
    return results;
}
