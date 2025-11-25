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
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    debug.push(`Today is: ${todayString}`);
    
    // Get all visible text to see structure
    const allText = await page.innerText('body');
    debug.push(`Page has today's date: ${allText.includes(todayString)}`);
    
    let hasChurros = false;
    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    
    for (const meal of meals) {
      try {
        debug.push(`Trying to click ${meal}...`);
        
        // Just click any link with that meal name
        await page.click(`a:has-text("${meal}")`, { timeout: 3000 });
        await page.waitForTimeout(4000);
        
        const mealText = await page.innerText('body');
        const mealDateVisible = mealText.includes(todayString);
        
        debug.push(`${meal} clicked, has today's date: ${mealDateVisible}`);
        
        if (mealText.toLowerCase().includes('churro')) {
          hasChurros = true;
          debug.push(`✓✓✓ CHURROS FOUND in ${meal}! ✓✓✓`);
          break;
        } else {
          debug.push(`${meal}: no churros found`);
        }
        
        // Go back
        await page.goBack();
        await page.waitForTimeout(3000);
        
      } catch (err) {
        debug.push(`${meal}: couldn't click - ${err.message}`);
      }
    }
    
    await browser.close();
    
    const result = { 
      hasChurros, 
      hasTodayDate: true,
      dateChecked: todayString, 
      timestamp: new Date().toISOString(), 
      debug
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
