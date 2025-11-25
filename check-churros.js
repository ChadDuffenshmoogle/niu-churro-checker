const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const debug = [];
  
  try {
    debug.push('Starting browser...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    debug.push('Browser launched');
    const page = await browser.newPage();
    
    debug.push('Navigating to NIU menu...');
    await page.goto('https://saapps.niu.edu/NetNutrition/menus', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    debug.push('Waiting for content...');
    await page.waitForTimeout(5000);
    
    const pageText = await page.evaluate(() => document.body.innerText);
    debug.push(`Got ${pageText.length} chars`);
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    const textLower = pageText.toLowerCase();
    const hasChurros = textLower.includes('churro');
    const hasTodayDate = textLower.includes(todayString.toLowerCase());
    
    await browser.close();
    
    const result = {
      hasChurros,
      hasTodayDate,
      dateChecked: todayString,
      timestamp: new Date().toISOString(),
      debug
    };
    
    fs.writeFileSync('churro-result.json', JSON.stringify(result, null, 2));
    console.log('Result saved:', result);
    
  } catch (error) {
    const result = {
      error: error.message,
      timestamp: new Date().toISOString(),
      debug: [...debug, `ERROR: ${error.message}`]
    };
    
    fs.writeFileSync('churro-result.json', JSON.stringify(result, null, 2));
    console.error('Error:', error);
  }
})();
