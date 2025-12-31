const { chromium } = require('playwright');
const fs = require('fs');

async function sendDiscordNotification(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'Shrimp Checker',
        avatar_url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/apple/285/shrimp_1f990.png'
      })
    });
  } catch (err) {
    console.log('Discord notification failed:', err.message);
  }
}

(async () => {
  const debug = [];
  let timeout;
  
  try {
    timeout = setTimeout(() => {
      debug.push('TIMEOUT: Aborting after 10 minutes');
      fs.writeFileSync('churro-result.json', JSON.stringify({ 
        error: 'Timeout after 10 minutes',
        timestamp: new Date().toISOString(),
        debug
      }, null, 2));
      process.exit(1);
    }, 10 * 60 * 1000);
    
    debug.push('Starting browser...');
    const browser = await chromium.launch({ timeout: 60000 });
    const page = await browser.newPage();
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    debug.push(`Today is: ${todayString}`);
    
    let hasTodayShrimp = false;
    let futureShrimp = [];
    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    
    const diningHalls = [
      { name: 'Neptune', link: 'Neptune Dining', submenu: 'Neptune Daily Menu' },
      { name: 'Patterson', link: 'Patterson Dining', submenu: 'Patterson Daily Menu' }
    ];
    
    for (const hall of diningHalls) {
      debug.push(`\n========== CHECKING ${hall.name.toUpperCase()} ==========`);
      
      debug.push('Navigating to main page...');
      await page.goto('https://saapps.niu.edu/NetNutrition/menus', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      debug.push(`Clicking ${hall.link}...`);
      await page.click(`text=${hall.link}`, { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      debug.push(`Clicking ${hall.submenu}...`);
      await page.click(`text=${hall.submenu}`, { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      const pageText = await page.innerText('body');
      
      if (pageText.includes('There are no menus available for this location')) {
        debug.push(`${hall.name}: No menus available (off-season). Skipping hall.`);
        continue;
      }
      
      const dateRegex = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/g;
      const foundDates = [...pageText.matchAll(dateRegex)].map(m => m[0]);
      
      if (foundDates.length === 0) {
        debug.push(`${hall.name}: No dates found. Skipping hall.`);
        continue;
      }
      
      debug.push(`${hall.name}: Found ${foundDates.length} dates`);
      
      // Only check today to avoid timeout
      const todayDates = foundDates.filter(d => d === todayString);
      if (todayDates.length === 0) {
        debug.push(`${hall.name}: Today's date (${todayString}) not found. Skipping hall.`);
        continue;
      }
      
      debug.push(`${hall.name}: Checking only today's meals`);
      for (const dateString of todayDates) {
        const isToday = dateString === todayString;
        debug.push(`\n--- ${hall.name}: Checking TODAY ---`);
        
        const dateRow = page.locator(`td:has-text("${dateString}")`).first();
        
        for (const meal of meals) {
          try {
            const mealLink = dateRow.locator(`..`).locator(`a:has-text("${meal}")`).first();
            
            if (await mealLink.isVisible({ timeout: 2000 })) {
              await mealLink.click({ timeout: 5000 });
              await page.waitForTimeout(5000);
              
              const mealText = await page.innerText('body');
              
              if (mealText.toLowerCase().includes('shrimp')) {
                debug.push(`🦐 ${hall.name} - ${meal}: SHRIMP FOUND!`);
                
                if (isToday) {
                  hasTodayShrimp = true;
                  futureShrimp.unshift({ location: hall.name, date: dateString, meal: meal, isToday: true });
                }
              } else {
                debug.push(`${hall.name} - ${meal}: no shrimp`);
              }
              
              await page.click('text=Back', { timeout: 5000 });
              await page.waitForTimeout(3000);
            } else {
              debug.push(`${hall.name} - ${meal}: not available`);
            }
            
          } catch (err) {
            debug.push(`${hall.name} - ${meal}: error - ${err.message}`);
          }
        }
        
        if (hasTodayShrimp) {
          debug.push(`Found shrimp today at ${hall.name}, stopping search`);
          break;
        }
      }
      
      if (hasTodayShrimp) {
        debug.push('Found shrimp today, stopping all searches');
        break;
      }
    }
    
    clearTimeout(timeout);
    await browser.close();
    
    if (hasTodayShrimp) {
      const todayShrimp = futureShrimp.find(fc => fc.isToday);
      const message = `🦐 **SHRIMP ALERT!** 🦐\n\nShrimp is available TODAY at **${todayShrimp.location}** for **${todayShrimp.meal}**!\n\nCheck: https://saapps.niu.edu/NetNutrition/menus`;
      await sendDiscordNotification(message);
      debug.push('Discord notification sent!');
    }
    
    const result = { 
      hasChurros: hasTodayShrimp,
      hasTodayDate: true,
      futureChurros: futureShrimp,
      dateChecked: todayString, 
      timestamp: new Date().toISOString(), 
      debug
    };
    fs.writeFileSync('churro-result.json', JSON.stringify(result, null, 2));
    
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    fs.writeFileSync('churro-result.json', JSON.stringify({ 
      error: error.message, 
      timestamp: new Date().toISOString(),
      debug: [...debug, `ERROR: ${error.message}`]
    }, null, 2));
  }
})();
