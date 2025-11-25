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
    
    debug.push('Waiting...');
    await page.waitForTimeout(5000);
    
    const pageText = await page.innerText('body');
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
    
    const result = { hasChurros, hasTodayDate, dateChecked: todayString, timestamp: new Date().toISOString(), debug };
    fs.writeFileSync('churro-result.json', JSON.stringify(result, null, 2));
    
  } catch (error) {
    fs.writeFileSync('churro-result.json', JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }, null, 2));
  }
})();
