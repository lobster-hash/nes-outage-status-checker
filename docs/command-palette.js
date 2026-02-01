/**
 * command-palette.js - Global Cmd+K / Ctrl+K search and action palette
 * Provides quick navigation and commands across the NES Outage Checker
 */

class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.searchQuery = '';
        this.selectedIndex = 0;
        this.recentSearches = this.loadRecentSearches();
        
        this.actions = [
            // Navigation
            { id: 'go-monitor', label: 'Go to Monitor', description: 'View current outages', category: 'Navigation', action: () => window.location.href = 'index.html' },
            { id: 'go-all', label: 'View All Outages', description: 'See all recorded outages', category: 'Navigation', action: () => window.location.href = 'all.html' },
            { id: 'go-stats', label: 'View Statistics', description: 'Analyze outage data', category: 'Navigation', action: () => window.location.href = 'stats.html' },
            { id: 'go-leaderboard', label: 'View Leaderboard', description: 'Compare neighborhoods', category: 'Navigation', action: () => window.location.href = 'feed.html' },
            { id: 'go-alerts', label: 'Manage Alerts', description: 'Set up notifications', category: 'Navigation', action: () => window.location.href = 'alerts.html' },
            
            // Area Actions
            { id: 'show-myarea', label: 'Show My Area', description: 'Filter to your neighborhood', category: 'Area', action: () => this.triggerGeofence() },
            { id: 'toggle-weather', label: 'Toggle Weather', description: 'Show/hide weather overlay', category: 'View', action: () => this.toggleWeather() },
            { id: 'toggle-eta', label: 'Toggle ETA', description: 'Show/hide repair estimates', category: 'View', action: () => this.toggleETA() },
            
            // Data Export
            { id: 'export-data', label: 'Export Data', description: 'Download as CSV', category: 'Export', action: () => this.exportData() },
            { id: 'share-results', label: 'Share Results', description: 'Copy shareable link', category: 'Export', action: () => this.shareResults() },
            
            // Settings & Help
            { id: 'toggle-theme', label: 'Toggle Dark/Light Mode', description: 'Switch theme', category: 'Settings', action: () => this.toggleTheme() },
            { id: 'toggle-colorblind', label: 'Toggle Colorblind Mode', description: 'Enable accessibility mode', category: 'Settings', action: () => this.toggleColorblindMode() },
            { id: 'keyboard-help', label: 'Keyboard Shortcuts', description: 'View all shortcuts', category: 'Help', action: () => this.showKeyboardShortcuts() },
            { id: 'about', label: 'About NES Outage Checker', description: 'Project info and credits', category: 'Help', action: () => this.showAbout() },
        ];
        
        this.filteredActions = this.actions;
        this.init();
    }
    
    init() {
        this.createHTML();
        this.attachEventListeners();
    }
    
    createHTML() {
        const html = `
            <div id="command-palette-overlay" class="command-palette-overlay" style="display: none;">
                <div class="command-palette-modal">
                    <div class="command-palette-header">
                        <input 
                            type="text" 
                            id="command-palette-input" 
                            class="command-palette-input" 
                            placeholder="Search actions, navigate to pages... (type to search)"
                            autocomplete="off"
                        >
                        <div class="command-palette-hint">
                            <span class="hint-key">↑↓</span> <span class="hint-text">Navigate</span>
                            <span class="hint-key">Enter</span> <span class="hint-text">Select</span>
                            <span class="hint-key">Esc</span> <span class="hint-text">Close</span>
                        </div>
                    </div>
                    
                    <div class="command-palette-content">
                        <div id="command-palette-recent" class="command-palette-section" style="display: none;">
                            <div class="command-palette-section-title">Recent Searches</div>
                            <div id="command-palette-recent-items" class="command-palette-items"></div>
                        </div>
                        
                        <div id="command-palette-results" class="command-palette-results">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        this.addStyles();
    }
    
    addStyles() {
        const styleId = 'command-palette-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .command-palette-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex !important;
                align-items: flex-start;
                justify-content: center;
                padding-top: 100px;
                z-index: 10000;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.15s ease-out;
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    backdrop-filter: blur(0px);
                }
                to {
                    opacity: 1;
                    backdrop-filter: blur(4px);
                }
            }
            
            .command-palette-modal {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                box-shadow: var(--shadow-lg);
                width: 90%;
                max-width: 600px;
                max-height: 70vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: slideDown 0.2s ease-out;
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .command-palette-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .command-palette-input {
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 16px;
                font-family: var(--font-body);
                outline: none;
                transition: all 0.2s;
            }
            
            .command-palette-input:focus {
                border-color: var(--accent);
                box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
            }
            
            .command-palette-hint {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: var(--text-muted);
            }
            
            .hint-key {
                background: var(--bg-tertiary);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: var(--font-mono);
                border: 1px solid var(--border-color);
                display: inline-block;
            }
            
            .command-palette-content {
                overflow-y: auto;
                flex: 1;
                max-height: calc(70vh - 100px);
            }
            
            .command-palette-section {
                padding: 12px 8px;
            }
            
            .command-palette-section-title {
                font-size: 12px;
                text-transform: uppercase;
                color: var(--text-muted);
                padding: 8px 12px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            
            .command-palette-results {
                display: grid;
                gap: 4px;
                padding: 8px;
            }
            
            .command-palette-group {
                margin-bottom: 8px;
            }
            
            .command-palette-group-title {
                font-size: 11px;
                text-transform: uppercase;
                color: var(--text-muted);
                padding: 8px 12px 4px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            
            .command-palette-item {
                padding: 10px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.1s;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .command-palette-item:hover,
            .command-palette-item.selected {
                background: var(--bg-tertiary);
            }
            
            .command-palette-item.selected {
                background: var(--accent-muted);
                border-left: 3px solid var(--accent);
                padding-left: 9px;
            }
            
            .command-palette-item-content {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
            }
            
            .command-palette-item-label {
                color: var(--text-primary);
                font-weight: 500;
                font-size: 14px;
            }
            
            .command-palette-item-description {
                color: var(--text-muted);
                font-size: 12px;
            }
            
            .command-palette-item-shortcut {
                color: var(--text-muted);
                font-size: 11px;
                font-family: var(--font-mono);
                margin-left: 16px;
                white-space: nowrap;
            }
            
            .command-palette-empty {
                padding: 32px 16px;
                text-align: center;
                color: var(--text-muted);
                font-size: 14px;
            }
            
            body.light-mode .command-palette-overlay {
                background: rgba(0, 0, 0, 0.4);
            }
            
            /* Mobile responsiveness */
            @media (max-width: 600px) {
                .command-palette-overlay {
                    padding-top: 50px;
                    align-items: flex-start;
                }
                
                .command-palette-modal {
                    width: 95%;
                    max-height: 80vh;
                    border-radius: 8px;
                }
                
                .command-palette-input {
                    font-size: 14px;
                }
                
                .command-palette-item {
                    padding: 8px 10px;
                    font-size: 13px;
                }
                
                .command-palette-hint {
                    gap: 8px;
                    font-size: 11px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    attachEventListeners() {
        // Global keyboard shortcut (Cmd+K / Ctrl+K)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            
            if (this.isOpen) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.close();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.moveSelection(-1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.moveSelection(1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectCurrent();
                }
            }
        });
        
        // Input search
        const input = document.getElementById('command-palette-input');
        input.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.updateResults();
        });
        
        // Close on overlay click
        const overlay = document.getElementById('command-palette-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        const overlay = document.getElementById('command-palette-overlay');
        overlay.style.display = 'flex';
        
        const input = document.getElementById('command-palette-input');
        input.focus();
        
        // Reset
        this.searchQuery = '';
        input.value = '';
        this.selectedIndex = 0;
        
        // Show recent searches if no query
        this.updateResults();
    }
    
    close() {
        this.isOpen = false;
        const overlay = document.getElementById('command-palette-overlay');
        overlay.style.display = 'none';
    }
    
    updateResults() {
        const resultsContainer = document.getElementById('command-palette-results');
        const recentContainer = document.getElementById('command-palette-recent');
        
        if (this.searchQuery.trim() === '') {
            // Show recent searches
            if (this.recentSearches.length > 0) {
                recentContainer.style.display = 'block';
                this.renderRecentSearches();
                resultsContainer.innerHTML = '';
                this.filteredActions = [];
            } else {
                recentContainer.style.display = 'none';
                this.filteredActions = this.actions;
                this.renderResults();
            }
        } else {
            recentContainer.style.display = 'none';
            this.filteredActions = this.fuzzySearch(this.searchQuery);
            this.renderResults();
            this.addRecentSearch(this.searchQuery);
        }
        
        this.selectedIndex = 0;
    }
    
    fuzzySearch(query) {
        const lowerQuery = query.toLowerCase();
        
        return this.actions
            .map(action => {
                const score = this.calculateFuzzyScore(
                    lowerQuery,
                    action.label.toLowerCase() + ' ' + action.description.toLowerCase()
                );
                return { action, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.action);
    }
    
    calculateFuzzyScore(query, text) {
        let score = 0;
        let queryIdx = 0;
        let textIdx = 0;
        
        // Exact substring match gets highest score
        if (text.includes(query)) {
            score += 100;
        }
        
        // Character-by-character matching
        while (queryIdx < query.length && textIdx < text.length) {
            if (query[queryIdx] === text[textIdx]) {
                score += 10;
                queryIdx++;
                textIdx++;
            } else {
                textIdx++;
            }
        }
        
        // Didn't match all characters
        if (queryIdx < query.length) {
            return 0;
        }
        
        return score;
    }
    
    renderResults() {
        const container = document.getElementById('command-palette-results');
        
        if (this.filteredActions.length === 0) {
            container.innerHTML = '<div class="command-palette-empty">No results found</div>';
            return;
        }
        
        // Group by category
        const grouped = {};
        this.filteredActions.forEach(action => {
            const category = action.category || 'Other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(action);
        });
        
        let html = '';
        let itemIndex = 0;
        
        Object.keys(grouped).forEach(category => {
            html += `<div class="command-palette-group">
                <div class="command-palette-group-title">${category}</div>
            `;
            
            grouped[category].forEach(action => {
                const isSelected = itemIndex === this.selectedIndex;
                html += `
                    <div class="command-palette-item ${isSelected ? 'selected' : ''}" data-index="${itemIndex}">
                        <div class="command-palette-item-content">
                            <div class="command-palette-item-label">${action.label}</div>
                            <div class="command-palette-item-description">${action.description}</div>
                        </div>
                    </div>
                `;
                itemIndex++;
            });
            
            html += '</div>';
        });
        
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.command-palette-item').forEach((item, idx) => {
            item.addEventListener('click', () => {
                this.selectedIndex = idx;
                this.selectCurrent();
            });
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = idx;
                this.updateSelection();
            });
        });
    }
    
    renderRecentSearches() {
        const container = document.getElementById('command-palette-recent-items');
        
        let html = '';
        this.recentSearches.slice(0, 5).forEach((search, idx) => {
            html += `
                <div class="command-palette-item" data-index="${idx}" data-search="${search}">
                    <div class="command-palette-item-content">
                        <div class="command-palette-item-label">🕐 ${search}</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        container.querySelectorAll('.command-palette-item').forEach((item) => {
            item.addEventListener('click', () => {
                const search = item.getAttribute('data-search');
                const input = document.getElementById('command-palette-input');
                input.value = search;
                this.searchQuery = search;
                this.updateResults();
            });
        });
    }
    
    moveSelection(direction) {
        const maxIndex = this.filteredActions.length - 1;
        this.selectedIndex = Math.max(0, Math.min(maxIndex, this.selectedIndex + direction));
        this.updateSelection();
    }
    
    updateSelection() {
        const items = document.querySelectorAll('.command-palette-item');
        items.forEach((item, idx) => {
            item.classList.toggle('selected', idx === this.selectedIndex);
        });
        
        // Scroll into view
        const selectedItem = items[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }
    
    selectCurrent() {
        if (this.filteredActions.length > 0) {
            const action = this.filteredActions[this.selectedIndex];
            if (action && action.action) {
                this.close();
                action.action();
            }
        }
    }
    
    loadRecentSearches() {
        const stored = localStorage.getItem('nes-command-palette-recent');
        return stored ? JSON.parse(stored) : [];
    }
    
    addRecentSearch(search) {
        if (search.trim() === '') return;
        
        // Remove duplicates
        this.recentSearches = this.recentSearches.filter(s => s !== search);
        
        // Add to front
        this.recentSearches.unshift(search);
        
        // Keep only last 20
        this.recentSearches = this.recentSearches.slice(0, 20);
        
        localStorage.setItem('nes-command-palette-recent', JSON.stringify(this.recentSearches));
    }
    
    // Action implementations
    triggerGeofence() {
        if (window.geofence && window.geofence.showMyArea) {
            window.geofence.showMyArea();
        } else {
            alert('My Area feature not available on this page');
        }
    }
    
    toggleWeather() {
        const event = new CustomEvent('toggle-weather');
        document.dispatchEvent(event);
    }
    
    toggleETA() {
        const event = new CustomEvent('toggle-eta');
        document.dispatchEvent(event);
    }
    
    exportData() {
        const event = new CustomEvent('export-data');
        document.dispatchEvent(event);
    }
    
    shareResults() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'NES Outage Status',
                url: url
            });
        } else {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('Link copied to clipboard!');
        }
    }
    
    toggleTheme() {
        const body = document.body;
        body.classList.toggle('light-mode');
        localStorage.setItem('nes-theme', body.classList.contains('light-mode') ? 'light' : 'dark');
    }
    
    toggleColorblindMode() {
        const body = document.body;
        body.classList.toggle('colorblind-mode');
        localStorage.setItem('nes-colorblind-mode', body.classList.contains('colorblind-mode') ? 'true' : 'false');
    }
    
    showKeyboardShortcuts() {
        alert(`
Keyboard Shortcuts:

Cmd+K / Ctrl+K   - Open Command Palette
↑ / ↓             - Navigate results
Enter             - Select action
Esc               - Close palette

Quick Actions:
  - View stats, leaderboards, alerts
  - Toggle dark/light mode
  - Toggle colorblind accessibility
  - Export data and share results
  - Show your area (geofence)
        `);
    }
    
    showAbout() {
        alert(`
NES Outage Status Checker

Track Nashville Electric Service outages and view detailed statistics about reliability by neighborhood.

Features:
  - Real-time outage monitoring
  - Historical data analysis
  - Neighborhood comparison
  - Dark/light mode with colorblind accessibility
  - Command palette for quick navigation

Data Source: NES API
Made with ⚡ for Nashville

https://github.com/lobster-hash/nes-outage-status-checker
        `);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.commandPalette) {
            window.commandPalette = new CommandPalette();
        }
    });
} else {
    if (!window.commandPalette) {
        window.commandPalette = new CommandPalette();
    }
}
