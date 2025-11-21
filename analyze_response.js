// Quick analysis of the response.json structure
const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('response.json', 'utf8'));
    
    console.log('📊 YTMusic API Response Analysis');
    console.log('================================');
    
    if (data.status === 'success' && data.data && data.data.feed) {
        console.log(`✅ Valid response structure`);
        console.log(`📁 Total sections: ${data.data.feed.length}`);
        
        let totalPlaylists = 0;
        let totalAlbums = 0;
        let totalSongs = 0;
        
        data.data.feed.forEach((section, index) => {
            const playlists = section.items?.filter(item => item.type === 'playlist').length || 0;
            const albums = section.items?.filter(item => item.type === 'album').length || 0;
            const songs = section.items?.filter(item => item.type === 'song').length || 0;
            
            console.log(`\n📂 Section ${index + 1}: "${section.sectionTitle}"`);
            console.log(`   Items: ${section.items?.length || 0} (${playlists} playlists, ${albums} albums, ${songs} songs)`);
            
            totalPlaylists += playlists;
            totalAlbums += albums;
            totalSongs += songs;
        });
        
        console.log('\n🎵 SUMMARY:');
        console.log(`Total Playlists: ${totalPlaylists}`);
        console.log(`Total Albums: ${totalAlbums}`);
        console.log(`Total Songs: ${totalSongs}`);
        
        if (totalPlaylists > 0 || totalAlbums > 0) {
            console.log('\n✅ SUCCESS: API has playlists and albums - React Native should display them!');
        } else {
            console.log('\n❌ ISSUE: No playlists or albums found');
        }
        
        // Show some sample items
        console.log('\n📋 Sample Items:');
        let sampleCount = 0;
        for (const section of data.data.feed) {
            if (section.items) {
                for (const item of section.items) {
                    if ((item.type === 'playlist' || item.type === 'album') && sampleCount < 5) {
                        console.log(`   ${sampleCount + 1}. "${item.title}" (${item.type}) from "${section.sectionTitle}"`);
                        sampleCount++;
                    }
                }
            }
            if (sampleCount >= 5) break;
        }
        
    } else {
        console.log('❌ Invalid response structure');
    }
    
} catch (error) {
    console.error('Error analyzing response:', error.message);
}