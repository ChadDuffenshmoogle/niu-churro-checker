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
    
    debug.push(`Looking for meals on: ${todayString}`);
    
    let hasChurros = false;
    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    
    for (const meal of meals) {
      try {
        debug.push(`Checking ${meal}...`);
        
        // Find the date section, then click the meal link
        const mealLink = page.locator(`text=${todayString}`).locator('..').locator(`text=${meal}`).first();
        
        if (await mealLink.isVisible({ timeout: 2000 })) {
          await mealLink.click();
          await page.waitForTimeout(3000);
          
          const mealText = await page.innerText('body');
          debug.push(`${meal}: ${mealText.length} chars`);
          
          if (mealText.toLowerCase().includes('churro')) {
            hasChurros = true;
            debug.push(`✓ CHURROS FOUND in ${meal}!`);
            break; // Found churros, no need to check other meals
          } else {
            debug.push(`${meal}: no churros`);
          }
          
          // Go back to menu list
          await page.click('text=Back');
          await page.waitForTimeout(2000);
        } else {
          debug.push(`${meal}: not available today`);
        }
      } catch (err) {
        debug.push(`${meal}: error - ${err.message}`);
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
