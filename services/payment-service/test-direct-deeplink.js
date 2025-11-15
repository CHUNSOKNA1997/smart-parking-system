// Direct test of Bakong deeplink API
import axios from 'axios';

async function testDeeplink() {
  try {
    console.log('Testing Bakong deeplink API directly...\n');

    const qrString = '00020101021229240020sokna_chun@pinc520459995303116540410.505802KH5914Smart Parking6010PHNOM PENH6304';

    const response = await axios.post(
      'https://sit-api-bakong.nbc.gov.kh/v1/generate_deeplink_by_qr',
      {
        qr: qrString,
        sourceInfo: {
          appName: 'Smart Parking',
          appIconUrl: 'https://smartparking.com/logo.png',
          appDeepLinkCallback: 'http://localhost:8080/payment/callback'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ FAILED!');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
  }
}

testDeeplink();
