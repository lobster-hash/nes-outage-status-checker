/**
 * NES Outage Checker - Popup Script
 * Handles popup UI logic and data display
 */

const CONFIG = {
  STORAGE_KEY: 'nes_outage_data',
  TIMESTAMP_KEY: 'nes_last_update',
  API_URL: 'https://api.nespower.com/outages', // Replace with actual API endpoint
  SITE_URL: 'https://outages.nespower.com',
  FULL_SITE_PATH: '/all.html',
  STATS_PATH: '/stats.html'
};

class OutageChecker {
  constructor() {
    this.initializeUI();
    this.attachEventListeners();
  }

  /**
   * Initialize UI elements
   */
  initializeUI() {
    this.statusContainer = document.getElementById('status-container');
    this.statsContainer = document.getElementById('stats-container');
    this.affectedList = document.getElementById('affected-list');
    this.outageCount = document.getElementById('outage-count');
    this.outageText = document.getElementById('outage-text');
    this.lastUpdated = document.getElementById('last-updated');
    this.errorContainer = document.getElementById('error-container');
    this.errorMessage = document.getElementById('error-message');
    this.spinner = document.getElementById('loading-spinner');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.fullSiteBtn = document.getElementById('full-site-btn');
    this.statsBtn = document.getElementById('stats-btn');
  }

  /**
   * Attach event listeners to buttons
   */
  attachEventListeners() {
    this.refreshBtn.addEventListener('click', () => this.handleRefresh());
    this.fullSiteBtn.addEventListener('click', () => this.openFullSite());
    this.statsBtn.addEventListener('click', () => this.openStats());
  }

  /**
   * Load and display outage data
   */
  async loadOutageData() {
    try {
      this.showLoading(true);
      this.hideError();

      // Try to fetch fresh data
      const data = await this.fetchOutageData();

      if (data) {
        this.displayData(data);
        this.updateTimestamp(data.timestamp);
        return;
      }

      // Fall back to cached data
      const cachedData = await this.getCachedData();
      if (cachedData) {
        this.displayData(cachedData);
        this.updateTimestamp(cachedData.timestamp, true);
        return;
      }

      // No data available
      this.showError('Unable to fetch outage data. Please try again.');
      this.statusContainer.classList.remove('loading');
    } catch (error) {
      console.error('Error loading outage data:', error);
      const cachedData = await this.getCachedData();
      if (cachedData) {
        this.displayData(cachedData);
        this.updateTimestamp(cachedData.timestamp, true);
      } else {
        this.showError(`Error: ${error.message}`);
      }
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Fetch outage data from API or storage
   */
  async fetchOutageData() {
    try {
      // Fetch from background script's cached data
      const result = await chrome.storage.local.get(CONFIG.STORAGE_KEY);
      return result[CONFIG.STORAGE_KEY] || null;
    } catch (error) {
      console.error('Storage access error:', error);
      return null;
    }
  }

  /**
   * Get cached data from storage
   */
  async getCachedData() {
    try {
      const result = await chrome.storage.local.get(CONFIG.STORAGE_KEY);
      return result[CONFIG.STORAGE_KEY] || null;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  /**
   * Display outage data in popup
   */
  displayData(data) {
    if (!data || !data.outages) {
      this.showError('No data available');
      return;
    }

    const outageCount = data.outages.length;
    const statusColor = this.getStatusColor(outageCount);

    // Update status container
    this.statusContainer.className = `status-container ${statusColor}`;

    // Update counts and summary
    this.outageCount.textContent = outageCount;
    const text = outageCount === 1 ? 'outage' : 'outages';
    this.outageText.textContent = text;

    if (outageCount === 0) {
      this.statusContainer.innerHTML = '<p style="font-size: 24px; margin: 0;">✅ All Clear!</p>';
      this.statsContainer.style.display = 'none';
    } else {
      this.statusContainer.innerHTML = `
        <div class="stat-item">
          <strong>${outageCount}</strong>
          <span>${text} active</span>
        </div>
      `;
      this.displayAffectedAreas(data.outages);
      this.statsContainer.style.display = 'block';
    }

    this.hideError();
  }

  /**
   * Display affected areas and customer counts
   */
  displayAffectedAreas(outages) {
    this.affectedList.innerHTML = '';

    const zipCounts = {};
    outages.forEach(outage => {
      const zip = outage.zip_code || outage.area || 'Unknown';
      const customers = outage.customers_affected || 0;
      if (!zipCounts[zip]) {
        zipCounts[zip] = 0;
      }
      zipCounts[zip] += customers;
    });

    // Display up to 3 most affected areas
    const areas = Object.entries(zipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (areas.length === 0) {
      return;
    }

    areas.forEach(([zip, count]) => {
      const item = document.createElement('div');
      item.className = 'affected-item';
      item.innerHTML = `
        <span class="zip">${zip}</span>: 
        <span class="count">${this.formatNumber(count)} customers</span>
      `;
      this.affectedList.appendChild(item);
    });
  }

  /**
   * Update last updated timestamp
   */
  updateTimestamp(timestamp, isCached = false) {
    try {
      if (!timestamp) {
        timestamp = Date.now();
      }

      const date = new Date(timestamp);
      const now = Date.now();
      const diffMs = now - timestamp;
      const diffMins = Math.floor(diffMs / 60000);

      let timeText = 'just now';
      if (diffMins > 0) {
        timeText = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      }

      const cached = isCached ? ' (cached)' : '';
      this.lastUpdated.textContent = `Last updated: ${timeText}${cached}`;
    } catch (error) {
      console.error('Error updating timestamp:', error);
      this.lastUpdated.textContent = 'Last updated: unknown';
    }
  }

  /**
   * Determine status color based on outage count
   */
  getStatusColor(count) {
    if (count === 0) return 'green';
    if (count <= 5) return 'green';
    if (count <= 20) return 'yellow';
    return 'red';
  }

  /**
   * Format large numbers with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.errorContainer.style.display = 'block';
    this.errorMessage.textContent = message;
    this.statusContainer.style.display = 'none';
  }

  /**
   * Hide error message
   */
  hideError() {
    this.errorContainer.style.display = 'none';
    this.statusContainer.style.display = 'flex';
  }

  /**
   * Show/hide loading spinner
   */
  showLoading(isLoading) {
    this.spinner.style.display = isLoading ? 'block' : 'none';
    this.refreshBtn.disabled = isLoading;
  }

  /**
   * Handle refresh button click
   */
  async handleRefresh() {
    this.loadOutageData();
  }

  /**
   * Open full site in new tab
   */
  openFullSite() {
    chrome.tabs.create({
      url: CONFIG.SITE_URL + CONFIG.FULL_SITE_PATH
    });
  }

  /**
   * Open stats page in new tab
   */
  openStats() {
    chrome.tabs.create({
      url: CONFIG.SITE_URL + CONFIG.STATS_PATH
    });
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  const checker = new OutageChecker();
  checker.loadOutageData();

  // Refresh every 30 seconds while popup is open
  setInterval(() => {
    checker.loadOutageData();
  }, 30000);
});
