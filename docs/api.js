/**
 * api.js - NES Outage Checker API & Webhook Support
 * Provides REST API endpoints and webhook delivery
 */

/**
 * Generate shareable outage status image/link
 * @param {Object} outageData - Outage data
 * @param {string} socialPlatform - 'twitter', 'facebook', 'generic'
 * @returns {Object} Share data with text and link
 */
function generateShareableStatus(outageData, socialPlatform = 'generic') {
    const area = getNeighborhoodName(outageData.zipCode);
    const customers = outageData.numPeople || 'many';
    const timestamp = new Date(outageData.startTime).toLocaleTimeString();

    const shareTexts = {
        'twitter': `🔴 Outage Update: ${customers} customers lost power in ${area} at ${timestamp}. NES is investigating. #NashvilleOutage`,
        'facebook': `⚡ Power outage affecting ${area}: ${customers} customers without power. Current status: Investigating. Track live at nesoutagecheck.com`,
        'generic': `Power outage in ${area}: ${customers} customers affected. Start time: ${timestamp}`
    };

    return {
        text: shareTexts[socialPlatform] || shareTexts.generic,
        url: window.location.href,
        hashtags: ['NashvilleOutage', 'NES', 'PowerOutage'],
        area,
        customers,
        timestamp
    };
}

/**
 * Generate social media share URLs
 * @param {Object} shareData - From generateShareableStatus()
 * @returns {Object} URLs for each platform
 */
function getSocialShareUrls(shareData) {
    const encodedText = encodeURIComponent(shareData.text);
    const encodedUrl = encodeURIComponent(shareData.url);

    return {
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        reddit: `https://reddit.com/submit?title=${encodedText}&url=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        copy: shareData.text // For copy-to-clipboard
    };
}

/**
 * Generate shareable reliability badge
 * @param {Object} areaStats - Area statistics
 * @returns {Object} Badge HTML and share data
 */
function generateReliabilityBadge(areaStats) {
    const score = calculateReliabilityScore(areaStats);
    const badgeColor = score > 80 ? '#10B981' : score > 60 ? '#F59E0B' : '#EF4444';
    const badgeText = score > 80 ? 'Excellent' : score > 60 ? 'Fair' : 'Poor';

    const badgeSvg = `
        <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="60" fill="#1C1917" rx="4"/>
            <text x="10" y="20" font-family="Arial" font-size="12" fill="#A8A29E">My Area Power Reliability</text>
            <text x="10" y="45" font-family="Arial" font-size="32" font-weight="bold" fill="${badgeColor}">${score}</text>
            <text x="120" y="35" font-family="Arial" font-size="14" fill="${badgeColor}" font-weight="bold">${badgeText}</text>
        </svg>
    `;

    return {
        svg: badgeSvg,
        html: `<img src="data:image/svg+xml;base64,${btoa(badgeSvg)}" alt="Reliability Badge: ${score}">`,
        score,
        rating: badgeText
    };
}

/**
 * Generate embeddable widget HTML for external sites
 * @param {string} area - Neighborhood/zip code
 * @param {Object} options - Widget options
 * @returns {string} Embeddable HTML/iframe
 */
function generateEmbeddableWidget(area, options = {}) {
    const width = options.width || '400px';
    const height = options.height || '300px';
    const showMap = options.showMap !== false;
    const showStats = options.showStats !== false;

    const widgetUrl = `${window.location.origin}/widget.html?area=${encodeURIComponent(area)}&showMap=${showMap}&showStats=${showStats}`;

    return {
        iframe: `<iframe src="${widgetUrl}" width="${width}" height="${height}" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`,
        html: `
            <div id="nes-outage-widget" style="width: ${width}; height: ${height}; background: #1C1917; border: 1px solid #444; border-radius: 8px; overflow: hidden;">
                <iframe src="${widgetUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        `,
        embedCode: `<iframe src="${widgetUrl}" width="${width}" height="${height}" frameborder="0" style="border: none;"></iframe>`
    };
}

/**
 * Export area statistics as PDF (client-side generation)
 * Requires an external library like html2pdf
 * @param {Object} areaStats - Area statistics
 * @param {string} areaName - Area name
 * @returns {Object} PDF data or error
 */
function exportStatsPDF(areaStats, areaName) {
    // This requires html2pdf.js library
    const htmlContent = `
        <h1>Power Reliability Report: ${areaName}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <h2>Overview</h2>
        <p>Reliability Score: ${calculateReliabilityScore(areaStats)}/100</p>
        <p>Total Outages: ${areaStats.outages}</p>
        <p>Average Duration: ${areaStats.avgDuration} hours</p>
        <p>Total Customers Affected: ${areaStats.totalAffected}</p>
        
        <h2>Statistics</h2>
        <ul>
            <li>Longest Outage: ${areaStats.maxDuration} hours</li>
            <li>Shortest Outage: ${areaStats.minDuration} hours</li>
            <li>Average Customers per Outage: ${(areaStats.totalAffected / areaStats.outages).toFixed(0)}</li>
        </ul>
    `;

    return {
        html: htmlContent,
        title: `NES-Reliability-Report-${areaName}-${new Date().toISOString().split('T')[0]}.pdf`,
        content: `
<!DOCTYPE html>
<html>
<head>
    <title>NES Outage Report - ${areaName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #F97316; }
        h2 { color: #666; margin-top: 30px; }
        .stat { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    </style>
</head>
<body>
    ${htmlContent}
    <footer style="margin-top: 50px; color: #999; font-size: 12px;">
        <p>Report generated by NES Outage Checker | Data source: Nashville Electric Service</p>
    </footer>
</body>
</html>
        `
    };
}

/**
 * Trigger webhook notifications for new outages
 * @param {Object} outageData - Outage data
 * @param {string} eventType - 'new', 'update', 'resolved'
 * @returns {Promise} Dispatch result
 */
async function dispatchWebhookNotification(outageData, eventType) {
    // Get configured alerts
    const alerts = JSON.parse(localStorage.getItem('nes-webhook-alerts') || '[]');

    // Filter alerts by event type and area
    const relevantAlerts = alerts.filter(alert => {
        if (!alert.triggers[eventType]) return false;
        if (alert.area && alert.area !== outageData.zipCode) return false;
        return true;
    });

    // Send to each webhook
    for (const alert of relevantAlerts) {
        const payload = buildWebhookPayload(outageData, eventType, alert.type);

        try {
            await fetch(alert.webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log(`Webhook sent to ${alert.type}: ${alert.webhook}`);
        } catch (err) {
            console.error(`Failed to send webhook: ${err.message}`);
        }
    }
}

/**
 * Build platform-specific webhook payload
 * @param {Object} outageData - Outage data
 * @param {string} eventType - Event type
 * @param {string} platform - 'discord', 'slack', 'custom'
 * @returns {Object} Formatted payload
 */
function buildWebhookPayload(outageData, eventType, platform) {
    const area = getNeighborhoodName(outageData.zipCode);
    const basePayload = {
        event: `outage_${eventType}`,
        timestamp: new Date().toISOString(),
        area,
        zipCode: outageData.zipCode,
        customersAffected: outageData.numPeople,
        status: outageData.status,
        startTime: new Date(outageData.startTime).toLocaleString()
    };

    // Platform-specific formatting
    if (platform === 'discord') {
        return {
            embeds: [{
                title: `⚡ ${eventType === 'resolved' ? '✅' : '🔴'} ${area} Outage ${eventType === 'resolved' ? 'Resolved' : eventType === 'new' ? 'Report' : 'Update'}`,
                description: `${outageData.numPeople} customers affected`,
                color: eventType === 'resolved' ? 0x10B981 : 0xEF4444,
                fields: [
                    { name: 'Area', value: area, inline: true },
                    { name: 'Zip Code', value: outageData.zipCode, inline: true },
                    { name: 'Status', value: outageData.status, inline: true },
                    { name: 'Start Time', value: new Date(outageData.startTime).toLocaleString(), inline: false }
                ]
            }]
        };
    }

    if (platform === 'slack') {
        return {
            text: `⚡ ${area} Outage ${eventType === 'resolved' ? 'Resolved' : eventType === 'new' ? 'Report' : 'Update'}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${area} Power Outage*\n${outageData.numPeople} customers affected\nStatus: ${outageData.status}`
                    }
                }
            ]
        };
    }

    return basePayload;
}

/**
 * Mock REST API responses (client-side)
 * In production, would call actual backend
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response
 */
async function callRestAPI(endpoint, params = {}) {
    // Simulated API responses
    const apis = {
        '/api/outages': async () => {
            // Would normally call backend
            return {
                success: true,
                data: [],
                message: 'Connect to NES API for live data'
            };
        },
        '/api/outages/:id': async () => {
            return {
                success: true,
                data: {}
            };
        },
        '/api/areas/stats': async () => {
            return {
                success: true,
                data: getMonthlySummary([])
            };
        },
        '/api/v1/outages/export': async () => {
            return {
                success: true,
                format: 'json',
                data: []
            };
        }
    };

    if (apis[endpoint]) {
        return apis[endpoint]();
    }

    throw new Error(`Unknown API endpoint: ${endpoint}`);
}

/**
 * Generate API documentation for developers
 * @returns {string} HTML documentation
 */
function generateAPIDocs() {
    return `
    <h1>NES Outage Checker - Developer API</h1>
    
    <h2>Overview</h2>
    <p>The NES Outage Checker API provides real-time outage data and webhooks for integration with external services.</p>
    
    <h2>Endpoints</h2>
    
    <h3>GET /api/outages</h3>
    <p>Get all current outages</p>
    <pre>curl https://nesoutagecheck.com/api/outages</pre>
    
    <h3>GET /api/outages/:id</h3>
    <p>Get specific outage details</p>
    <pre>curl https://nesoutagecheck.com/api/outages/12345</pre>
    
    <h3>GET /api/areas/stats</h3>
    <p>Get area statistics and reliability metrics</p>
    <pre>curl https://nesoutagecheck.com/api/areas/stats?zipCode=37201</pre>
    
    <h3>POST /api/v1/outages/export</h3>
    <p>Export outage data</p>
    <pre>curl -X POST https://nesoutagecheck.com/api/v1/outages/export?format=json&area=37201</pre>
    
    <h2>Webhook Events</h2>
    <ul>
        <li><code>outage_new</code> - New outage reported</li>
        <li><code>outage_update</code> - Outage status updated</li>
        <li><code>outage_resolved</code> - Power restored</li>
    </ul>
    
    <h2>Authentication</h2>
    <p>Include API key as query parameter: <code>?api_key=YOUR_KEY</code></p>
    `;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateShareableStatus,
        getSocialShareUrls,
        generateReliabilityBadge,
        generateEmbeddableWidget,
        exportStatsPDF,
        dispatchWebhookNotification,
        buildWebhookPayload,
        callRestAPI,
        generateAPIDocs
    };
}
