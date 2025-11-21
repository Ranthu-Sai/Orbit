// Quick test to check if the server is running
const fetch = require('node-fetch');

async function quickTest() {
    console.log('🧪 Quick Server Test');
    console.log('==================');
    
    try {
        console.log('Testing http://localhost:5001/health...');
        const healthResponse = await fetch('http://localhost:5001/health');
        console.log('Health Status:', healthResponse.status);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health Check:', healthData.status);
        }
        
        console.log('\nTesting http://localhost:5001/api/homefeed...');
        const homefeedResponse = await fetch('http://localhost:5001/api/homefeed?limit=3');
        console.log('Homefeed Status:', homefeedResponse.status);
        
        if (homefeedResponse.ok) {
            const homefeedData = await homefeedResponse.json();
            console.log('✅ Homefeed Response:', {
                status: homefeedData.status,
                sections: homefeedData.data?.feed?.length || 0
            });
        }
        
    } catch (error) {
        console.error('❌ Server Test Failed:', error.message);
        console.log('\n💡 To fix:');
        console.log('   1. Start the server: python restapi_prod.py');
        console.log('   2. Make sure it\'s running on port 5001');
    }
}

quickTest();