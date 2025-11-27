const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const debug = [];
  
  try {
    debug.push('Starting browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    debug.push(`Today is: ${todayString}`);
    
    let hasTodayChurros = false;
    let futureChurros = [];
    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    
    const diningHalls = [
      { name: 'Neptune', link: 'Neptune Dining', submenu: 'Neptune Daily Menu' },
      { name: 'Patterson', link: 'Patterson Dining', submenu: 'Patterson Daily Menu' }
    ];
    
    for (const hall of diningHalls) {
      debug.push(`\n========== CHECKING ${hall.name.toUpperCase()} ==========`);
      
      debug.push('Navigating to main page...');
      await page.goto('https://saapps.niu.edu/NetNutrition/menus', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      debug.push(`Clicking ${hall.link}...`);
      await page.click(`text=${hall.link}`);
      await page.waitForTimeout(3000);
      
      debug.push(`Clicking ${hall.submenu}...`);
      await page.click(`text=${hall.submenu}`);
      await page.waitForTimeout(5000);
      
      const pageText = await page.innerText('body');
      const dateRegex = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/g;
      const foundDates = [...pageText.matchAll(dateRegex)].map(m => m[0]);
      
      debug.push(`${hall.name}: Found ${foundDates.length} dates: ${foundDates.join('; ')}`);
      
      for (const dateString of foundDates) {
        const isToday = dateString === todayString;
        debug.push(`\n--- ${hall.name}: Checking ${isToday ? 'TODAY' : dateString} ---`);
        
        const dateRow = page.locator(`td:has-text("${dateString}")`).first();
        
        for (const meal of meals) {
          try {
            const mealLink = dateRow.locator(`..`).locator(`a:has-text("${meal}")`).first();
            
            if (await mealLink.isVisible({ timeout: 2000 })) {
              await mealLink.click();
              await page.waitForTimeout(5000);
              
              const mealText = await page.innerText('body');
              
              if (mealText.toLowerCase().includes('churro')) {
                debug.push(`🎉 ${hall.name} - ${dateString} - ${meal}: CHURROS FOUND!`);
                
                if (isToday) {
                  hasTodayChurros = true;
                  futureChurros.unshift({ location: hall.name, date: dateString, meal: meal, isToday: true });
                } else {
                  futureChurros.push({ location: hall.name, date: dateString, meal: meal, isToday: false });
                }
              } else {
                debug.push(`${hall.name} - ${dateString} - ${meal}: no churros`);
              }
              
              await page.click('text=Back');
              await page.waitForTimeout(3000);
            } else {
              debug.push(`${hall.name} - ${dateString} - ${meal}: not available`);
            }
            
          } catch (err) {
            debug.push(`${hall.name} - ${dateString} - ${meal}: error - ${err.message}`);
          }
        }
        
        if (hasTodayChurros) {
          debug.push(`Found churros today at ${hall.name}, stopping search for this hall`);
          break;
        }
      }
      
      if (hasTodayChurros) {
        debug.push('Found churros today, stopping all searches');
        break;
      }
    }
    
    await browser.close();
    
    const result = { 
      hasChurros: hasTodayChurros,
      hasTodayDate: true,
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
