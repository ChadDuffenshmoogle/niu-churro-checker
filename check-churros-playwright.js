const https = require('https');
const fs = require('fs');

async function sendDiscordNotification(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'Shrimp Checker'
      })
    });
  } catch (err) {
    console.log('Discord notification failed:', err.message);
  }
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  console.log('Checking for shrimp...');
  
  try {
    const html = await fetchPage('https://saapps.niu.edu/NetNutrition/menus');
    const hasShrimp = html.toLowerCase().includes('shrimp');
    
    const result = {
      hasChurros: hasShrimp,
      dateChecked: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      method: 'simple-http'
    };
    
    if (hasShrimp) {
      console.log('SHRIMP FOUND!');
      await sendDiscordNotification('🦐 **SHRIMP DETECTED!** Check https://saapps.niu.edu/NetNutrition/menus');
    } else {
      console.log('No shrimp found');
    }
    
    fs.writeFileSync('churro-result.json', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
    fs.writeFileSync('churro-result.json', JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
})();
