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
    
    // Get all visible dates on the page
    const pageText = await page.innerText('body');
    const dateRegex = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/g;
    const foundDates = [...pageText.matchAll(dateRegex)].map(m => m[0]);
    
    debug.push(`Found ${foundDates.length} dates on page: ${foundDates.join('; ')}`);
    
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    debug.push(`Today is: ${todayString}`);
    
    let hasTodayChurros = false;
    let futureChurros = [];
    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    
    // Check each date
    for (const dateString of foundDates) {
      const isToday = dateString === todayString;
      debug.push(`\n--- Checking ${isToday ? 'TODAY' : dateString} ---`);
      
      const dateRow = page.locator(`td:has-text("${dateString}")`).first();
      
      for (const meal of meals) {
        try {
          const mealLink = dateRow.locator(`..`).locator(`a:has-text("${meal}")`).first();
          
          if (await mealLink.isVisible({ timeout: 2000 })) {
            await mealLink.click();
            await page.waitForTimeout(5000);
            
            const mealText = await page.innerText('body');
            
            if (mealText.toLowerCase().includes('pork')) {
              debug.push(`🎉 ${dateString} - ${meal}: CHURROS FOUND!`);
              
              if (isToday) {
                hasTodayChurros = true;
              } else {
                futureChurros.push({ date: dateString, meal: meal });
              }
            } else {
              debug.push(`${dateString} - ${meal}: no churros`);
            }
            
            await page.click('text=Back');
            await page.waitForTimeout(3000);
          } else {
            debug.push(`${dateString} - ${meal}: not available`);
          }
          
        } catch (err) {
          debug.push(`${dateString} - ${meal}: error - ${err.message}`);
        }
      }
      
      // If we found churros today, no need to check future days
      if (hasTodayChurros) {
        debug.push('Found churros today, stopping search');
        break;
      }
    }
    
    await browser.close();
    
    const result = { 
      hasChurros: hasTodayChurros,
      hasTodayDate: foundDates.includes(todayString),
      futureChurros: futureChurros,
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
