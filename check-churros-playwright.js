const { chromium } = require('playwright');
const fs = require('fs');

// CONFIGURE YOUR FOODS HERE
const FOODS_CONFIG = {
  'shrimp': { emoji: '🦐', alertName: 'SHRIMP ALERT' },
  'leches': { emoji: '🍰', alertName: 'TRES LECHES ALERT' }
};

async function sendDiscordNotification(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
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
      fs.writeFileSync('food-result.json', JSON.stringify({ 
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
    debug.push(`Looking for: ${Object.keys(FOODS_CONFIG).join(', ')}`);
    
    let foundFoods = [];
    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    
    const diningHalls = [
      { name: 'Neptune', link: 'Neptune Dining', submenu: 'Neptune Daily Menu' },
      { name: 'Patterson', link: 'Patterson Dining', submenu: 'Patterson Daily Menu' }
    ];
    
    for (const hall of diningHalls) {
      debug.push(`\n========== CHECKING ${hall.name.toUpperCase()} ==========`);
      
      try {
        debug.push('Navigating to main page...');
        await page.goto('https://saapps.niu.edu/NetNutrition/menus', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        debug.push(`Clicking ${hall.link}...`);
        await page.click(`text=${hall.link}`, { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        debug.push(`Clicking ${hall.submenu}...`);
        await page.click(`text=${hall.submenu}`, { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        const pageText = await page.innerText('body');
        
        if (pageText.includes('There are no menus available')) {
          debug.push(`${hall.name}: No menus available. Skipping.`);
          continue;
        }
        
        const dateRegex = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/g;
        const foundDates = [...pageText.matchAll(dateRegex)].map(m => m[0]);
        
        if (foundDates.length === 0) {
          debug.push(`${hall.name}: No dates found. Skipping.`);
          continue;
        }
        
        const todayDates = foundDates.filter(d => d === todayString);
        if (todayDates.length === 0) {
          debug.push(`${hall.name}: Today not found on menu. Skipping.`);
          continue;
        }
        
        debug.push(`${hall.name}: Checking only today`);
        
        const dateRow = page.locator(`td:has-text("${todayString}")`).first();
        
        for (const meal of meals) {
          try {
            const mealLink = dateRow.locator(`..`).locator(`a:has-text("${meal}")`).first();
            
            if (await mealLink.isVisible({ timeout: 2000 })) {
              await mealLink.click({ timeout: 5000 });
              await page.waitForTimeout(3000);
              
              const mealText = await page.innerText('body');
              const mealTextLower = mealText.toLowerCase();
              
              // Check each configured food
              for (const [foodKey, foodConfig] of Object.entries(FOODS_CONFIG)) {
                if (mealTextLower.includes(foodKey)) {
                  // Extract the full item name
                  const lines = mealText.split('\n');
                  const matchingItems = lines.filter(line => 
                    line.toLowerCase().includes(foodKey) && line.trim().length > 0
                  );
                  
                  const itemName = matchingItems[0] || foodKey;
                  
                  debug.push(`${foodConfig.emoji} ${hall.name} - ${meal}: Found ${itemName}`);
                  foundFoods.push({
                    searchKey: foodKey,
                    itemName: itemName.trim(),
                    location: hall.name,
                    meal: meal,
                    emoji: foodConfig.emoji,
                    alertName: foodConfig.alertName
                  });
                }
              }
              
              await page.click('text=Back', { timeout: 5000 });
              await page.waitForTimeout(2000);
            } else {
              debug.push(`${hall.name} - ${meal}: not available`);
            }
          } catch (err) {
            debug.push(`${hall.name} - ${meal}: error - ${err.message}`);
          }
        }
      } catch (err) {
        debug.push(`${hall.name}: Hall error - ${err.message}`);
      }
    }
    
    clearTimeout(timeout);
    await browser.close();
    debug.push('Browser closed successfully');
    
    // Send individual notifications for each food type
    if (foundFoods.length > 0) {
      // Group by food type
      const groupedByFood = {};
      for (const food of foundFoods) {
        if (!groupedByFood[food.searchKey]) {
          groupedByFood[food.searchKey] = [];
        }
        groupedByFood[food.searchKey].push(food);
      }
      
      // Send a notification for each food type
      for (const [foodKey, items] of Object.entries(groupedByFood)) {
        const firstItem = items[0];
        const locations = items.map(f => 
          `${f.emoji} **${f.itemName}** at **${f.location}** for **${f.meal}**`
        ).join('\n');
        
        const message = `${firstItem.emoji} **${firstItem.alertName}!** ${firstItem.emoji}\n${locations}\nCheck: https://saapps.niu.edu/NetNutrition/menus`;
        
        await sendDiscordNotification(message);
        debug.push(`Discord notification sent for ${foodKey}!`);
        
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      debug.push('No target foods found today');
    }
    
    const result = { 
      foundFoods: foundFoods,
      dateChecked: todayString, 
      timestamp: new Date().toISOString(), 
      debug
    };
    fs.writeFileSync('food-result.json', JSON.stringify(result, null, 2));
    
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    fs.writeFileSync('food-result.json', JSON.stringify({ 
      error: error.message, 
      timestamp: new Date().toISOString(),
      debug: [...debug, `ERROR: ${error.message}`]
    }, null, 2));
  }
})();
