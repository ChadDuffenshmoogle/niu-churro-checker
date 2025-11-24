const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

let lastCheck = { status: 'not checked yet', timestamp: null };

app.get('/', async (req, res) => {
  res.json(lastCheck);
});

app.get('/check', async (req, res) => {
  const debug = [];
  
  try {
    debug.push('Starting browser...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    debug.push('Browser launched');
    const page = await browser.newPage();
    
    debug.push('Navigating to NIU menu page...');
    await page.goto('https://saapps.niu.edu/NetNutrition/menus', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    debug.push('Page loaded, waiting for content...');
    await page.waitForTimeout(5000);
    
    debug.push('Getting page content...');
    const pageText = await page.evaluate(() => document.body.innerText);
    
    debug.push(`Page text length: ${pageText.length}`);
    debug.push(`First 500 chars: ${pageText.substring(0, 500)}`);
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const todayString = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    debug.push(`Looking for date: ${todayString}`);
    
    const textLower = pageText.toLowerCase();
    const hasChurros = textLower.includes('churro');
    const hasTodayDate = textLower.includes(todayString.toLowerCase());
    
    debug.push(`Has churros: ${hasChurros}`);
    debug.push(`Has today's date: ${hasTodayDate}`);
    
    await browser.close();
    debug.push('Browser closed');
    
    lastCheck = {
      hasChurros,
      hasTodayDate,
      dateChecked: todayString,
      timestamp: new Date().toISOString(),
      debug
    };
    
    res.json(lastCheck);
    
  } catch (error) {
    debug.push(`ERROR: ${error.message}`);
    debug.push(`Stack: ${error.stack}`);
    
    lastCheck = {
      error: error.message,
      timestamp: new Date().toISOString(),
      debug
    };
    
    res.json(lastCheck);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
