const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const debug = [];
  
  try {
    debug.push('Starting browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    debug.push('Navigating...');
    await page.goto('https://saapps.niu.edu/NetNutrition/menus', { waitUntil: 'networkidle' });
    
    debug.push('Waiting 10 seconds for content to load...');
    await page.waitForTimeout(10000);
    
    const pageText = await page.innerText('body');
    debug.push(`Got ${pageText.length} chars`);
    debug.push(`First 500 chars: ${pageText.substring(0, 500)}`);
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    debug.push(`Looking for: ${todayString}`);
    
    const textLower = pageText.toLowerCase();
    const hasChurros = textLower.includes('churro');
    const hasTodayDate = textLower.includes(todayString.toLowerCase());
    
    debug.push(`Has "churro": ${hasChurros}`);
    debug.push(`Has date: ${hasTodayDate}`);
    
    await browser.close();
    
    const result = { 
      hasChurros, 
      hasTodayDate, 
      dateChecked: todayString, 
      timestamp: new Date().toISOString(), 
      debug,
      pagePreview: pageText.substring(0, 1000)
    };
    fs.writeFileSync('churro-result.json', JSON.stringify(result, null, 2));
    
  } catch (error) {
    fs.writeFileSync('churro-result.json', JSON.stringify({ 
      error: error.message, 
      timestamp: new Date().toISOString(),
      debug: [...debug, `ERROR: ${error.message}`]
    }, null, 2));
  }
})();
