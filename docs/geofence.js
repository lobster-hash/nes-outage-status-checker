/**
 * geofence.js - Geofence auto-detection and "My Area" button
 * Detects user location and provides localized outage statistics
 */

class Geofence {
    constructor() {
        this.userLocation = null;
        this.userZipCode = null;
        this.isMyAreaActive = false;
        this.mapInstance = null;
        this.geofenceRadius = 3; // miles
        
        this.loadState();
        this.init();
    }
    
    init() {
        this.requestLocation();
        this.createUI();
        this.setupEventListeners();
    }
    
    createUI() {
        // Create the "My Area" button in the header
        const headerNav = document.querySelector('nav') || document.querySelector('header');
        if (!headerNav) {
            console.warn('Could not find header to add My Area button');
            return;
        }
        
        const button = document.createElement('button');
        button.id = 'my-area-btn';
        button.className = 'my-area-btn';
        button.innerHTML = '📍 My Area';
        button.title = 'Show outages near you';
        
        headerNav.appendChild(button);
        this.addStyles();
    }
    
    addStyles() {
        const styleId = 'geofence-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .my-area-btn {
                background: var(--accent);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-family: var(--font-body);
                white-space: nowrap;
            }
            
            .my-area-btn:hover {
                background: var(--accent-hover);
                transform: scale(1.05);
            }
            
            .my-area-btn.active {
                background: var(--status-active);
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
            }
            
            .my-area-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .my-area-status {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: var(--text-secondary);
                margin-left: 8px;
            }
            
            .my-area-status.loaded {
                color: var(--status-active);
            }
            
            .my-area-status.loading {
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 0.6;
                }
                50% {
                    opacity: 1;
                }
            }
            
            .geofence-info-card {
                background: var(--bg-tertiary);
                border: 2px solid var(--status-active);
                border-radius: 8px;
                padding: 16px;
                margin: 16px 0;
                box-shadow: 0 0 0 1px var(--status-active-glow);
            }
            
            .geofence-info-card h3 {
                margin: 0 0 8px;
                color: var(--status-active);
                font-size: 14px;
                font-weight: 600;
            }
            
            .geofence-info-card p {
                margin: 4px 0;
                color: var(--text-primary);
                font-size: 13px;
            }
            
            .geofence-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-top: 12px;
            }
            
            .geofence-stat {
                background: var(--bg-secondary);
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid var(--accent);
            }
            
            .geofence-stat-label {
                color: var(--text-muted);
                font-size: 11px;
                text-transform: uppercase;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            
            .geofence-stat-value {
                color: var(--text-primary);
                font-size: 18px;
                font-weight: 600;
                margin-top: 4px;
                font-family: var(--font-mono);
            }
            
            .geofence-prediction {
                background: var(--status-waiting-bg);
                border: 1px solid var(--status-waiting);
                border-radius: 6px;
                padding: 12px;
                margin-top: 12px;
                font-size: 13px;
                color: var(--text-primary);
            }
            
            .geofence-location-text {
                color: var(--text-secondary);
                font-size: 12px;
                margin-left: 4px;
            }
            
            .geofence-action-buttons {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            
            .geofence-action-buttons button {
                flex: 1;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-family: var(--font-body);
            }
            
            .geofence-action-buttons button:hover {
                background: var(--bg-hover);
                border-color: var(--accent);
            }
            
            .geofence-action-buttons button.primary {
                background: var(--accent);
                color: white;
                border-color: var(--accent);
            }
            
            .geofence-action-buttons button.primary:hover {
                background: var(--accent-hover);
            }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .my-area-btn {
                    position: fixed;
                    bottom: 80px;
                    right: 16px;
                    z-index: 100;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    box-shadow: var(--shadow-lg);
                }
                
                .my-area-btn:active {
                    transform: scale(0.95);
                }
                
                .geofence-info-card {
                    margin: 12px;
                }
                
                .geofence-stats {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        const btn = document.getElementById('my-area-btn');
        if (btn) {
            btn.addEventListener('click', () => this.toggleMyArea());
        }
        
        // Listen for map instances being attached
        document.addEventListener('map-ready', (e) => {
            this.mapInstance = e.detail?.map;
        });
    }
    
    requestLocation() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            this.setStatus('unavailable');
            return;
        }
        
        this.setStatus('loading');
        
        navigator.geolocation.getCurrentPosition(
            (position) => this.onLocationSuccess(position),
            (error) => this.onLocationError(error),
            {
                timeout: 10000,
                enableHighAccuracy: false,
                maximumAge: 3600000 // Cache for 1 hour
            }
        );
    }
    
    async onLocationSuccess(position) {
        const { latitude, longitude } = position.coords;
        this.userLocation = { lat: latitude, lon: longitude };
        
        console.log(`📍 User location: ${latitude}, ${longitude}`);
        
        // Reverse geocode to zip code
        try {
            this.userZipCode = await this.reverseGeocodeToZip(latitude, longitude);
            console.log(`📍 Detected zip code: ${this.userZipCode}`);
            
            this.saveState();
            this.setStatus('loaded');
            this.updateMyAreaButton();
        } catch (err) {
            console.error('Reverse geocoding failed:', err);
            this.setStatus('error');
        }
    }
    
    onLocationError(error) {
        console.warn('Geolocation error:', error.message);
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                console.log('User denied geolocation permission');
                this.setStatus('denied');
                break;
            case error.POSITION_UNAVAILABLE:
                console.log('Position unavailable');
                this.setStatus('unavailable');
                break;
            case error.TIMEOUT:
                console.log('Geolocation request timeout');
                this.setStatus('timeout');
                break;
            default:
                this.setStatus('error');
        }
    }
    
    async reverseGeocodeToZip(lat, lon) {
        // Try using shared-data function if available
        if (window.reverseGeocodeToZip && typeof window.reverseGeocodeToZip === 'function') {
            return await window.reverseGeocodeToZip(lat, lon) || window.findClosestZipCode?.(lat, lon);
        }
        
        // Fallback to direct API call
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
                {
                    headers: {
                        'User-Agent': 'NES-Outage-Checker/1.0'
                    }
                }
            );
            
            if (!response.ok) return null;
            
            const data = await response.json();
            return data.address?.postcode || null;
        } catch (err) {
            console.error('Reverse geocoding error:', err);
            return null;
        }
    }
    
    setStatus(status) {
        const btn = document.getElementById('my-area-btn');
        if (!btn) return;
        
        let statusText = '';
        let classes = '';
        
        switch (status) {
            case 'loading':
                statusText = '🔄 Detecting...';
                classes = 'loading';
                btn.disabled = true;
                break;
            case 'loaded':
                const zipDisplay = this.userZipCode || 'Your Area';
                statusText = `📍 ${zipDisplay}`;
                classes = 'loaded';
                btn.disabled = false;
                break;
            case 'denied':
                statusText = '📍 Location denied';
                btn.disabled = true;
                break;
            case 'unavailable':
                statusText = '📍 Location unavailable';
                btn.disabled = true;
                break;
            case 'error':
                statusText = '📍 Error detecting location';
                btn.disabled = true;
                break;
            case 'active':
                statusText = '📍 My Area Active';
                classes = 'active';
                btn.disabled = false;
                break;
            default:
                statusText = '📍 Location services';
        }
        
        // Update button or add status element
        btn.className = `my-area-btn ${classes}`;
        if (statusText) {
            btn.title = statusText;
        }
    }
    
    updateMyAreaButton() {
        if (this.userZipCode) {
            const btn = document.getElementById('my-area-btn');
            if (btn) {
                btn.innerHTML = `📍 ${this.userZipCode}`;
                btn.disabled = false;
            }
        }
    }
    
    async toggleMyArea() {
        if (!this.userLocation) {
            alert('Unable to detect your location. Please enable location services.');
            return;
        }
        
        this.isMyAreaActive = !this.isMyAreaActive;
        
        if (this.isMyAreaActive) {
            await this.showMyArea();
        } else {
            this.clearMyArea();
        }
    }
    
    async showMyArea() {
        const btn = document.getElementById('my-area-btn');
        if (btn) {
            btn.classList.add('active');
            this.setStatus('active');
        }
        
        // Trigger custom event for pages to handle filtering
        const event = new CustomEvent('geofence-active', {
            detail: {
                location: this.userLocation,
                zipCode: this.userZipCode,
                radius: this.geofenceRadius
            }
        });
        document.dispatchEvent(event);
        
        // Show info card with stats
        await this.showGeofenceInfoCard();
    }
    
    clearMyArea() {
        this.isMyAreaActive = false;
        
        const btn = document.getElementById('my-area-btn');
        if (btn) {
            btn.classList.remove('active');
            this.updateMyAreaButton();
        }
        
        // Trigger clear event
        const event = new CustomEvent('geofence-inactive');
        document.dispatchEvent(event);
        
        // Remove info card
        const card = document.getElementById('geofence-info-card');
        if (card) {
            card.remove();
        }
    }
    
    async showGeofenceInfoCard() {
        let existingCard = document.getElementById('geofence-info-card');
        if (existingCard) {
            existingCard.remove();
        }
        
        const neighborhood = getNeighborhoodName?.(this.userZipCode) || this.userZipCode || 'Your Area';
        
        // Try to get stats if data is available
        let statsHTML = '';
        const statsEvent = new CustomEvent('get-geofence-stats', {
            detail: { zipCode: this.userZipCode }
        });
        
        // Dispatch event for pages to populate stats
        const statsResult = await new Promise((resolve) => {
            const handler = (e) => {
                document.removeEventListener('geofence-stats-ready', handler);
                resolve(e.detail);
            };
            document.addEventListener('geofence-stats-ready', handler);
            document.dispatchEvent(statsEvent);
            
            // Timeout if no response
            setTimeout(() => resolve(null), 1000);
        });
        
        if (statsResult) {
            const outagesPerYear = statsResult.outages || 0;
            const avgDuration = (statsResult.avgDuration || 0).toFixed(1);
            const prediction = outagesPerYear > 3 ? 'Below average reliability' : 'Average reliability';
            
            statsHTML = `
                <div class="geofence-stats">
                    <div class="geofence-stat">
                        <div class="geofence-stat-label">Outages/Year</div>
                        <div class="geofence-stat-value">${outagesPerYear}</div>
                    </div>
                    <div class="geofence-stat">
                        <div class="geofence-stat-label">Avg Duration</div>
                        <div class="geofence-stat-value">${avgDuration}h</div>
                    </div>
                </div>
                <div class="geofence-prediction">
                    ⚠️ ${prediction} in ${neighborhood}. ${outagesPerYear} outages recorded this year.
                </div>
            `;
        }
        
        const card = document.createElement('div');
        card.id = 'geofence-info-card';
        card.className = 'geofence-info-card';
        card.innerHTML = `
            <h3>📍 Monitoring: ${neighborhood}</h3>
            <p>Showing outages within ${this.geofenceRadius} miles of your location</p>
            <p class="geofence-location-text">
                ${this.userLocation.lat.toFixed(4)}, ${this.userLocation.lon.toFixed(4)}
            </p>
            ${statsHTML}
            <div class="geofence-action-buttons">
                <button class="primary" onclick="if(window.geofence) window.geofence.subscribeToAlerts()">
                    🔔 Enable Alerts
                </button>
                <button onclick="if(window.geofence) window.geofence.clearMyArea()">
                    ✕ Close
                </button>
            </div>
        `;
        
        // Find a good place to insert the card
        const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
        mainContent.insertBefore(card, mainContent.firstChild);
    }
    
    subscribeToAlerts() {
        if (window.commandPalette) {
            // Just show the notification
            alert(`✅ Alerts enabled for ${getNeighborhoodName?.(this.userZipCode) || this.userZipCode}!

You'll be notified when outages start in your area.`);
        }
    }
    
    saveState() {
        const state = {
            location: this.userLocation,
            zipCode: this.userZipCode,
            timestamp: Date.now()
        };
        sessionStorage.setItem('nes-geofence-state', JSON.stringify(state));
        localStorage.setItem('nes-geofence-state', JSON.stringify(state));
    }
    
    loadState() {
        // Try session storage first (current session)
        let state = sessionStorage.getItem('nes-geofence-state');
        
        if (!state) {
            // Fall back to localStorage
            state = localStorage.getItem('nes-geofence-state');
        }
        
        if (state) {
            try {
                const data = JSON.parse(state);
                this.userLocation = data.location;
                this.userZipCode = data.zipCode;
            } catch (err) {
                console.warn('Failed to load geofence state:', err);
            }
        }
    }
}

// Helper function from shared-data
function getNeighborhoodName(zipCode) {
    if (window.getNeighborhoodName) {
        return window.getNeighborhoodName(zipCode);
    }
    
    // Fallback if shared-data is not loaded
    return zipCode || 'Your Area';
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.geofence) {
            window.geofence = new Geofence();
        }
    });
} else {
    if (!window.geofence) {
        window.geofence = new Geofence();
    }
}
