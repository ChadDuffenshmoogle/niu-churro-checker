const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const debug = [];
  
  try {
    debug.push('Starting browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    debug.push('Navigating to main page...');
    await page.goto('https://saapps.niu.edu/NetNutrition/menus', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    debug.push('Clicking Neptune Dining...');
    await page.click('text=Neptune Dining');
    await page.waitForTimeout(3000);
    
    debug.push('Clicking Neptune Daily Menu...');
    await page.click('text=Neptune Daily Menu');
    await page.waitForTimeout(5000);
    
    const pageText = await page.innerText('body');
    debug.push(`Got ${pageText.length} chars after Neptune Daily Menu`);
    debug.push(`First 1000 chars: ${pageText.substring(0, 1000)}`);
    
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
    debug.push(`Has today's date visible: ${hasTodayDate}`);
    
    await browser.close();
    
    const result = { 
      hasChurros, 
      hasTodayDate, 
      dateChecked: todayString, 
      timestamp: new Date().toISOString(), 
      debug,
      pagePreview: pageText.substring(0, 1500)
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
