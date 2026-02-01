/**
 * NES Outage Checker - Background Service Worker
 * Handles periodic updates and badge management
 */

const CONFIG = {
  STORAGE_KEY: 'nes_outage_data',
  TIMESTAMP_KEY: 'nes_last_update',
  UPDATE_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  API_URL: 'https://api.nespower.com/outages', // Replace with actual API endpoint
  TIMEOUT_MS: 10000 // 10 second timeout
};

let updateInterval = null;

/**
 * Initialize background service worker
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'INSTALL') {
    console.log('NES Outage Checker extension installed');
    // Initialize with default data
    initializeStorage();
    startPeriodicUpdates();
  } else if (details.reason === 'UPDATE') {
    console.log('NES Outage Checker extension updated');
    startPeriodicUpdates();
  }
});

/**
 * Start periodic updates when extension starts
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started - starting outage updates');
  startPeriodicUpdates();
});

/**
 * Initialize storage with empty data
 */
async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEY);
    if (!result[CONFIG.STORAGE_KEY]) {
      const initialData = {
        outages: [],
        timestamp: Date.now(),
        last_fetch: null
      };
      await chrome.storage.local.set({
        [CONFIG.STORAGE_KEY]: initialData
      });
      updateBadge(0);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

/**
 * Start periodic update interval
 */
function startPeriodicUpdates() {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // Fetch immediately
  updateOutageData();

  // Then fetch every 5 minutes
  updateInterval = setInterval(updateOutageData, CONFIG.UPDATE_INTERVAL_MS);
}

/**
 * Stop periodic updates
 */
function stopPeriodicUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

/**
 * Fetch outage data from API
 */
async function updateOutageData() {
  try {
    console.log('Fetching outage data...');
    
    // For now, fetch from localStorage API mock
    // In production, this would fetch from the actual NES API
    const data = await fetchFromAPI();
    
    if (data) {
      await saveOutageData(data);
      updateBadge(data.outages?.length || 0);
      console.log(`Updated: ${data.outages?.length || 0} outages found`);
    }
  } catch (error) {
    console.error('Error updating outage data:', error);
    // Keep existing data on error
  }
}

/**
 * Fetch data from NES API or mock data source
 */
async function fetchFromAPI() {
  try {
    // Set a timeout for the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    const response = await fetch(CONFIG.API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NES-Outage-Checker/1.0'
      },
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return formatOutageData(data);
  } catch (error) {
    // If fetch fails, try to get from local cache
    console.warn('Fetch failed, using cached data:', error.message);
    return null;
  }
}

/**
 * Format API response to standard outage data structure
 */
function formatOutageData(rawData) {
  try {
    // Normalize API response to our format
    let outages = [];
    
    if (Array.isArray(rawData)) {
      outages = rawData;
    } else if (rawData.outages) {
      outages = rawData.outages;
    } else if (rawData.data) {
      outages = rawData.data;
    }

    return {
      outages: outages.map(o => ({
        id: o.id || o.outage_id || Math.random().toString(),
        zip_code: o.zip_code || o.zip || o.area || 'Unknown',
        area: o.area || o.name || o.zip_code || 'Unknown Area',
        customers_affected: o.customers_affected || o.customers || 0,
        start_time: o.start_time || o.started_at || null,
        estimated_restoration: o.estimated_restoration || o.estimated_time || null,
        cause: o.cause || null
      })),
      timestamp: Date.now(),
      last_fetch: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error formatting outage data:', error);
    return null;
  }
}

/**
 * Save outage data to storage
 */
async function saveOutageData(data) {
  try {
    await chrome.storage.local.set({
      [CONFIG.STORAGE_KEY]: data
    });
  } catch (error) {
    console.error('Error saving outage data:', error);
  }
}

/**
 * Update extension badge with outage count
 */
function updateBadge(count) {
  try {
    let badge = '';
    let color = '#10b981'; // green

    if (count === 0) {
      badge = '';
      color = '#10b981';
    } else if (count <= 5) {
      badge = count.toString();
      color = '#10b981';
    } else if (count <= 20) {
      badge = count.toString();
      color = '#f59e0b'; // yellow
    } else {
      badge = '!';
      color = '#ef4444'; // red
    }

    // Set badge text
    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: badge });
      chrome.action.setBadgeBackgroundColor({ color });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

/**
 * Handle messages from popup or other scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_outage_data') {
    chrome.storage.local.get(CONFIG.STORAGE_KEY, (result) => {
      sendResponse(result[CONFIG.STORAGE_KEY]);
    });
    return true; // Keep channel open for async response
  } else if (request.action === 'refresh_now') {
    updateOutageData().then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'start_updates') {
    startPeriodicUpdates();
    sendResponse({ success: true });
  } else if (request.action === 'stop_updates') {
    stopPeriodicUpdates();
    sendResponse({ success: true });
  }
});

/**
 * Initialize when service worker starts
 */
console.log('NES Outage Checker background service worker loaded');
initializeStorage().then(() => {
  startPeriodicUpdates();
});

/**
 * Clean up on extension disable/uninstall
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'INSTALL') {
    // Show welcome page (optional)
    chrome.tabs.create({
      url: 'https://nespower.com/welcome'
    });
  }
});
