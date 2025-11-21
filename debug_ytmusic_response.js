// Debug script to test YTMusic API response
const fetch = require('node-fetch');

async function testYTMusicAPI() {
    console.log('🧪 Testing YTMusic API Response Structure');
    console.log('=' * 50);
    
    try {
        const response = await fetch('http://localhost:5001/api/homefeed?limit=10');
        
        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        
        console.log('📊 API Response Analysis:');
        console.log(`Status: ${data.status}`);
        console.log(`Has data: ${!!data.data}`);
        console.log(`Has feed: ${!!(data.data && data.data.feed)}`);
        
        if (data.data && data.data.feed) {
            console.log(`Total sections: ${data.data.feed.length}`);
            
            let totalPlaylists = 0;
            let totalAlbums = 0;
            let totalSongs = 0;
            
            data.data.feed.forEach((section, index) => {
                const playlists = section.items?.filter(item => item.type === 'playlist').length || 0;
                const albums = section.items?.filter(item => item.type === 'album').length || 0;
                const songs = section.items?.filter(item => item.type === 'song').length || 0;
                
                console.log(`\n📁 Section ${index + 1}: "${section.sectionTitle}"`);
                console.log(`   Total items: ${section.items?.length || 0}`);
                console.log(`   Playlists: ${playlists}`);
                console.log(`   Albums: ${albums}`);
                console.log(`   Songs: ${songs}`);
                
                totalPlaylists += playlists;
                totalAlbums += albums;
                totalSongs += songs;
                
                // Show first few items as examples
                if (section.items && section.items.length > 0) {
                    console.log('   Sample items:');
                    section.items.slice(0, 3).forEach((item, i) => {
                        console.log(`     ${i + 1}. "${item.title}" (${item.type})`);
                    });
                }
            });
            
            console.log('\n🎵 Summary:');
            console.log(`Total Playlists: ${totalPlaylists}`);
            console.log(`Total Albums: ${totalAlbums}`);
            console.log(`Total Songs: ${totalSongs}`);
            console.log(`Total Items: ${totalPlaylists + totalAlbums + totalSongs}`);
            
            if (totalPlaylists > 0 || totalAlbums > 0) {
                console.log('\n✅ API is returning playlists and albums - React Native should show content!');
            } else {
                console.log('\n⚠️  API is not returning any playlists or albums - only songs');
            }
        } else {
            console.log('❌ Invalid response structure');
        }
        
    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

testYTMusicAPI();