import fetch from 'node-fetch';

async function testWalletEndpoint() {
  try {
    // Test without auth (should fail with 401)
    console.log('Testing wallet endpoint without auth...');
    const response1 = await fetch('http://localhost:8000/api/wallet');
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', data1);
    
    // The endpoint exists if we get 401 (unauthorized) instead of 404
    if (response1.status === 401) {
      console.log('\n✅ Wallet endpoint exists and requires authentication');
    } else if (response1.status === 404) {
      console.log('\n❌ Wallet endpoint not found (404)');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWalletEndpoint();
