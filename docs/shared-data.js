/**
 * shared-data.js - Shared utilities for NES Outage Checker
 * Handles zip code mapping, reverse geocoding, and area statistics
 * Includes outage analytics, impact calculation, severity scoring
 */

// Industry definitions and cost multipliers
const INDUSTRY_DATA = {
    'healthcare': { name: 'Healthcare', weight: 2.5, examples: ['hospitals', 'clinics', 'emergency'] },
    'financial': { name: 'Financial Services', weight: 2.0, examples: ['banks', 'credit_unions', 'atms'] },
    'retail': { name: 'Retail & Commerce', weight: 1.2, examples: ['stores', 'malls', 'gas_stations'] },
    'manufacturing': { name: 'Manufacturing', weight: 2.3, examples: ['factories', 'plants', 'warehouses'] },
    'telecom': { name: 'Telecommunications', weight: 1.8, examples: ['cell_towers', 'internet_hubs'] },
    'transportation': { name: 'Transportation', weight: 1.5, examples: ['traffic_lights', 'buses', 'trains'] },
    'residential': { name: 'Residential', weight: 1.0, examples: ['homes', 'apartments'] },
    'education': { name: 'Education', weight: 0.8, examples: ['schools', 'universities'] }
};

// Average hourly cost impact by industry (in USD per hour)
const HOURLY_IMPACT_COST = {
    'healthcare': 450,      // Hospital critical operations
    'financial': 380,       // ATMs, banking systems
    'retail': 185,          // Point of sale, lighting, refrigeration
    'manufacturing': 420,   // Production lines
    'telecom': 320,         // Network infrastructure
    'transportation': 280,  // Traffic management, transit
    'residential': 35,      // Residential (per household)
    'education': 90         // Schools, universities
};

// Nashville neighborhood zip code mappings
const NASHVILLE_ZIP_CODES = {
    '37201': { name: 'Downtown/Capitol Hill', lat: 36.1627, lon: -86.7816 },
    '37202': { name: 'North Nashville', lat: 36.1950, lon: -86.7810 },
    '37203': { name: 'East Nashville', lat: 36.1633, lon: -86.7520 },
    '37204': { name: 'Germantown/Salemtown', lat: 36.1784, lon: -86.7644 },
    '37205': { name: 'Sylvan Park/West End', lat: 36.1450, lon: -86.8200 },
    '37206': { name: 'Shelby Park/Weaver Park', lat: 36.1533, lon: -86.7180 },
    '37207': { name: 'Inglewood/Parkwood', lat: 36.1317, lon: -86.7420 },
    '37208': { name: 'North Nashville', lat: 36.2100, lon: -86.8050 },
    '37209': { name: 'Hermitage', lat: 36.1083, lon: -86.6580 },
    '37210': { name: 'Antioch', lat: 36.0233, lon: -86.7050 },
    '37211': { name: 'Brentwood', lat: 35.9667, lon: -86.7833 },
    '37212': { name: 'Belmont/The Nations', lat: 36.1350, lon: -86.8550 },
    '37214': { name: 'Southeast Nashville', lat: 36.0733, lon: -86.7050 },
    '37215': { name: 'Belle Meade', lat: 36.1533, lon: -86.9050 },
    '37216': { name: 'East Nashville', lat: 36.1733, lon: -86.7300 },
    '37217': { name: 'Riverside', lat: 36.0933, lon: -86.8700 },
    '37218': { name: 'MetroCenter', lat: 36.1650, lon: -86.8350 },
    '37219': { name: 'Downtown', lat: 36.1600, lon: -86.7750 },
    '37220': { name: 'Green Hills/Buena Vista', lat: 36.1117, lon: -86.8033 },
    '37221': { name: 'Hendersonville', lat: 36.3050, lon: -86.6250 },
    '37222': { name: 'Smyrna/Lavergne', lat: 35.9933, lon: -86.5883 },
    '37224': { name: 'Murfreesboro Pike', lat: 36.0550, lon: -86.6750 },
    '37228': { name: 'Airport/Berry Hill', lat: 36.1250, lon: -86.6880 },
    '37229': { name: 'Goodlettsville', lat: 36.3167, lon: -86.6950 },
    '37230': { name: 'Hermitage/Donelson', lat: 36.0933, lon: -86.6580 },
    '37231': { name: 'Antioch', lat: 36.0433, lon: -86.6980 },
    '37232': { name: 'Madison', lat: 36.1933, lon: -86.7333 },
    '37235': { name: 'Glencliff', lat: 36.0700, lon: -86.8150 },
    '37238': { name: 'Downtown', lat: 36.1600, lon: -86.7700 }
};

/**
 * Convert coordinates to zip code using Nominatim reverse geocoding
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string>} Zip code string
 */
async function reverseGeocodeToZip(lat, lon) {
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
        const postalCode = data.address?.postcode;
        
        return postalCode || null;
    } catch (err) {
        console.error('Reverse geocoding error:', err);
        return null;
    }
}

/**
 * Get neighborhood name from zip code
 * @param {string} zipCode - 5-digit zip code
 * @returns {string} Neighborhood name or zip code if not found
 */
function getNeighborhoodName(zipCode) {
    const zip = zipCode?.toString().substring(0, 5);
    return NASHVILLE_ZIP_CODES[zip]?.name || zip || 'Unknown Area';
}

/**
 * Find closest zip code from coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} Closest zip code
 */
function findClosestZipCode(lat, lon) {
    let closest = null;
    let minDistance = Infinity;
    
    Object.entries(NASHVILLE_ZIP_CODES).forEach(([zip, data]) => {
        const dist = Math.sqrt(
            Math.pow(data.lat - lat, 2) + Math.pow(data.lon - lon, 2)
        );
        if (dist < minDistance) {
            minDistance = dist;
            closest = zip;
        }
    });
    
    return closest;
}

/**
 * Extract or generate zip code from event data
 * Uses reverse geocoding if available, falls back to closest match
 * @param {Object} event - Event object with lat/lon
 * @returns {Promise<string>} Zip code
 */
async function getZipCodeForEvent(event) {
    if (!event) return null;
    
    // If event already has zip code, use it
    if (event.zipCode) return event.zipCode;
    
    if (!event.latitude || !event.longitude) return null;
    
    // Try reverse geocoding first (cached in localStorage to reduce API calls)
    const geocodingCache = JSON.parse(localStorage.getItem('nes-geocoding-cache') || '{}');
    const cacheKey = `${event.latitude.toFixed(4)},${event.longitude.toFixed(4)}`;
    
    if (geocodingCache[cacheKey]) {
        return geocodingCache[cacheKey];
    }
    
    // Rate-limited reverse geocoding (max 1 req/sec per Nominatim ToS)
    const reverseGeoCode = await reverseGeocodeToZip(event.latitude, event.longitude);
    if (reverseGeoCode) {
        geocodingCache[cacheKey] = reverseGeoCode;
        localStorage.setItem('nes-geocoding-cache', JSON.stringify(geocodingCache));
        return reverseGeoCode;
    }
    
    // Fall back to finding closest zip code
    const closest = findClosestZipCode(event.latitude, event.longitude);
    geocodingCache[cacheKey] = closest;
    localStorage.setItem('nes-geocoding-cache', JSON.stringify(geocodingCache));
    return closest;
}

/**
 * Calculate reliability score for an area
 * @param {Object} areaStats - Area statistics object
 * @returns {number} Reliability score (0-100, higher is better)
 */
function calculateReliabilityScore(areaStats) {
    if (!areaStats.outages) return 100;
    
    // Score based on frequency and duration
    const frequencyPenalty = Math.min(areaStats.outages * 5, 50);
    const durationPenalty = Math.min(areaStats.avgDuration * 2, 30);
    const impactPenalty = Math.min((areaStats.totalAffected / 100), 20);
    
    const score = Math.max(0, 100 - frequencyPenalty - durationPenalty - impactPenalty);
    return Math.round(score);
}

/**
 * Compare area to city average
 * @param {Object} areaStats - Area statistics
 * @param {Array} allAreas - All areas for comparison
 * @returns {Object} Comparison metrics
 */
function compareToAverage(areaStats, allAreas) {
    if (allAreas.length === 0) return { factor: 1, rating: 'average' };
    
    const avgOutages = allAreas.reduce((sum, a) => sum + a.outages, 0) / allAreas.length;
    const avgDuration = allAreas.reduce((sum, a) => sum + a.avgDuration, 0) / allAreas.length;
    
    const factor = areaStats.outages / avgOutages;
    let rating = 'average';
    
    if (factor < 0.5) rating = 'excellent';
    else if (factor < 0.8) rating = 'above-average';
    else if (factor > 1.5) rating = 'poor';
    else if (factor > 1.2) rating = 'below-average';
    
    return {
        factor: factor.toFixed(1),
        rating,
        percentageDiff: Math.round((factor - 1) * 100)
    };
}

/**
 * Export area history to CSV
 * @param {Array} historyData - History array
 * @param {string} zipCode - Optional zip code filter
 * @returns {string} CSV content
 */
function exportToCSV(historyData, zipCode = null) {
    const headers = ['Date', 'Time', 'Duration (hrs)', 'People Affected', 'Status', 'Area', 'Zip Code'];
    const rows = [];
    
    historyData.forEach(entry => {
        if (zipCode && entry.zipCode !== zipCode) return;
        
        const date = new Date(entry.startTime);
        const duration = ((entry.lastUpdatedTime - entry.startTime) / (1000 * 60 * 60)).toFixed(2);
        
        rows.push([
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            duration,
            entry.numPeople,
            entry.status || 'unknown',
            getNeighborhoodName(entry.zipCode),
            entry.zipCode || 'N/A'
        ]);
    });
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csv;
}

/**
 * Get hourly distribution of outages (for time-of-day analysis)
 * @param {Array} historyData - History array
 * @returns {Object} Hour -> count mapping
 */
function getHourlyDistribution(historyData) {
    const hourMap = {};
    
    for (let hour = 0; hour < 24; hour++) {
        hourMap[hour] = 0;
    }
    
    historyData.forEach(entry => {
        const date = new Date(entry.startTime);
        const hour = date.getHours();
        hourMap[hour]++;
    });
    
    return hourMap;
}

/**
 * Get monthly summary for reports
 * @param {Array} historyData - History array
 * @returns {Object} Month -> stats mapping
 */
function getMonthlySummary(historyData) {
    const monthMap = {};
    
    historyData.forEach(entry => {
        const date = new Date(entry.startTime);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthMap[monthKey]) {
            monthMap[monthKey] = {
                outages: 0,
                totalDuration: 0,
                totalAffected: 0,
                incidents: []
            };
        }
        
        const duration = (entry.lastUpdatedTime - entry.startTime) / (1000 * 60 * 60);
        monthMap[monthKey].outages++;
        monthMap[monthKey].totalDuration += duration;
        monthMap[monthKey].totalAffected += entry.numPeople;
        monthMap[monthKey].incidents.push(entry);
    });
    
    // Calculate averages
    Object.values(monthMap).forEach(month => {
        month.avgDuration = (month.totalDuration / month.outages).toFixed(2);
        month.avgAffected = Math.round(month.totalAffected / month.outages);
    });
    
    return monthMap;
}

/**
 * Find worst month (by various metrics)
 * @param {Object} monthlySummary - Monthly summary object from getMonthlySummary()
 * @returns {Object} Worst month data with metric
 */
function findWorstMonth(monthlySummary) {
    const months = Object.entries(monthlySummary);
    if (months.length === 0) return null;
    
    const worstByOutages = months.reduce((prev, curr) => 
        curr[1].outages > prev[1].outages ? curr : prev
    );
    
    const worstByDuration = months.reduce((prev, curr) => 
        curr[1].totalDuration > prev[1].totalDuration ? curr : prev
    );
    
    const worstByImpact = months.reduce((prev, curr) => 
        curr[1].totalAffected > prev[1].totalAffected ? curr : prev
    );
    
    return {
        outages: worstByOutages,
        duration: worstByDuration,
        impact: worstByImpact
    };
}

/**
 * Advanced filtering utilities for outage history
 */

/**
 * Filter outages by date range
 * @param {Array} historyData - History array
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Filtered outages
 */
function filterByDateRange(historyData, startDate, endDate) {
    const start = startDate.getTime();
    const end = endDate.getTime();
    
    return historyData.filter(entry => {
        const entryTime = new Date(entry.startTime).getTime();
        return entryTime >= start && entryTime <= end;
    });
}

/**
 * Filter outages by cause/type
 * @param {Array} historyData - History array
 * @param {string} cause - Cause filter (e.g., 'weather', 'accident', 'equipment', 'unknown')
 * @returns {Array} Filtered outages
 */
function filterByCause(historyData, cause) {
    return historyData.filter(entry => 
        (entry.cause || 'unknown').toLowerCase() === cause.toLowerCase()
    );
}

/**
 * Filter outages by severity/duration
 * @param {Array} historyData - History array
 * @param {number} minDurationHours - Minimum duration
 * @param {number} maxDurationHours - Maximum duration
 * @returns {Array} Filtered outages
 */
function filterBySeverity(historyData, minDurationHours = 0, maxDurationHours = Infinity) {
    return historyData.filter(entry => {
        const duration = (entry.lastUpdatedTime - entry.startTime) / (1000 * 60 * 60);
        return duration >= minDurationHours && duration <= maxDurationHours;
    });
}

/**
 * Filter outages by impact (number of customers)
 * @param {Array} historyData - History array
 * @param {number} minCustomers - Minimum customers affected
 * @returns {Array} Filtered outages
 */
function filterByImpact(historyData, minCustomers) {
    return historyData.filter(entry => entry.numPeople >= minCustomers);
}

/**
 * Search outages by area name
 * @param {Array} historyData - History array
 * @param {string} searchTerm - Search term
 * @returns {Array} Matching outages
 */
function searchByArea(historyData, searchTerm) {
    const term = searchTerm.toLowerCase();
    return historyData.filter(entry => {
        const areaName = getNeighborhoodName(entry.zipCode).toLowerCase();
        return areaName.includes(term);
    });
}

/**
 * Get timeline of outages by day
 * @param {Array} historyData - History array
 * @returns {Object} Day -> outages mapping
 */
function getOutageTimeline(historyData) {
    const timeline = {};
    
    historyData.forEach(entry => {
        const date = new Date(entry.startTime);
        const dayKey = date.toISOString().split('T')[0];
        
        if (!timeline[dayKey]) {
            timeline[dayKey] = [];
        }
        timeline[dayKey].push(entry);
    });
    
    return timeline;
}

/**
 * Get day-of-week distribution (which days have most outages)
 * @param {Array} historyData - History array
 * @returns {Object} Day name -> count
 */
function getDayOfWeekDistribution(historyData) {
    const dayMap = {
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0,
        'Sunday': 0
    };
    
    historyData.forEach(entry => {
        const date = new Date(entry.startTime);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        dayMap[dayName]++;
    });
    
    return dayMap;
}

/**
 * Calculate trend analysis over time
 * @param {Array} historyData - History array
 * @param {number} periodDays - Number of days to compare (e.g., 30)
 * @returns {Object} Trend data with percentages
 */
function calculateTrend(historyData, periodDays = 30) {
    const now = Date.now();
    const recentStart = now - (periodDays * 24 * 60 * 60 * 1000);
    const olderStart = recentStart - (periodDays * 24 * 60 * 60 * 1000);
    
    const recentOutages = historyData.filter(e => {
        const time = new Date(e.startTime).getTime();
        return time >= recentStart;
    });
    
    const olderOutages = historyData.filter(e => {
        const time = new Date(e.startTime).getTime();
        return time >= olderStart && time < recentStart;
    });
    
    const recentCount = recentOutages.length;
    const olderCount = olderOutages.length;
    const percentChange = olderCount > 0 ? ((recentCount - olderCount) / olderCount) * 100 : 0;
    
    return {
        recent: recentCount,
        older: olderCount,
        percentChange: percentChange.toFixed(1),
        trend: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable'
    };
}

/**
 * Get worst neighborhoods (by various metrics)
 * @param {Array} historyData - History array
 * @param {number} limit - Number of top results
 * @returns {Array} Ranked neighborhoods
 */
function getWorstNeighborhoods(historyData, limit = 10) {
    const areaStats = {};
    
    historyData.forEach(entry => {
        const area = entry.zipCode || 'unknown';
        const areaName = getNeighborhoodName(area);
        
        if (!areaStats[area]) {
            areaStats[area] = {
                area,
                name: areaName,
                outages: 0,
                totalDuration: 0,
                totalAffected: 0
            };
        }
        
        const duration = (entry.lastUpdatedTime - entry.startTime) / (1000 * 60 * 60);
        areaStats[area].outages++;
        areaStats[area].totalDuration += duration;
        areaStats[area].totalAffected += entry.numPeople;
    });
    
    return Object.values(areaStats)
        .sort((a, b) => b.outages - a.outages)
        .slice(0, limit)
        .map(a => ({
            ...a,
            avgDuration: (a.totalDuration / a.outages).toFixed(2),
            avgAffected: Math.round(a.totalAffected / a.outages),
            score: calculateReliabilityScore({
                outages: a.outages,
                avgDuration: a.totalDuration / a.outages,
                totalAffected: a.totalAffected
            })
        }));
}

/**
 * Get seasonal analysis (patterns by month/season)
 * @param {Array} historyData - History array
 * @returns {Object} Season -> stats
 */
function getSeasonalAnalysis(historyData) {
    const seasons = {
        'Winter': { months: [12, 1, 2], outages: 0, duration: 0 },
        'Spring': { months: [3, 4, 5], outages: 0, duration: 0 },
        'Summer': { months: [6, 7, 8], outages: 0, duration: 0 },
        'Fall': { months: [9, 10, 11], outages: 0, duration: 0 }
    };
    
    historyData.forEach(entry => {
        const date = new Date(entry.startTime);
        const month = date.getMonth() + 1;
        const duration = (entry.lastUpdatedTime - entry.startTime) / (1000 * 60 * 60);
        
        Object.entries(seasons).forEach(([season, data]) => {
            if (data.months.includes(month)) {
                data.outages++;
                data.duration += duration;
            }
        });
    });
    
    // Calculate averages
    Object.values(seasons).forEach(season => {
        if (season.outages > 0) {
            season.avgDuration = (season.duration / season.outages).toFixed(2);
        }
    });
    
    return seasons;
}

/**
 * Generate advanced analytics summary
 * @param {Array} historyData - History array
 * @returns {Object} Comprehensive analytics
 */
function generateAdvancedAnalytics(historyData) {
    if (historyData.length === 0) {
        return {
            status: 'no_data',
            message: 'No outage history available'
        };
    }
    
    const timeline = getOutageTimeline(historyData);
    const dayDistribution = getDayOfWeekDistribution(historyData);
    const hourDistribution = getHourlyDistribution(historyData);
    const monthSummary = getMonthlySummary(historyData);
    const trend = calculateTrend(historyData, 30);
    const worst = getWorstNeighborhoods(historyData, 5);
    const seasonal = getSeasonalAnalysis(historyData);
    
    return {
        totalOutages: historyData.length,
        dateRange: {
            start: new Date(Math.min(...historyData.map(e => new Date(e.startTime)))).toLocaleDateString(),
            end: new Date(Math.max(...historyData.map(e => new Date(e.startTime)))).toLocaleDateString()
        },
        averageOutages: (historyData.length / Object.keys(monthSummary).length).toFixed(1),
        trend,
        worstNeighborhoods: worst,
        peakHour: Math.max(...Object.values(hourDistribution), 0),
        peakDay: Object.entries(dayDistribution).reduce((a, b) => a[1] > b[1] ? a : b)[0],
        seasonalAnalysis: seasonal,
        timeline
    };
}

/**
 * ==================== FEATURE 1: OUTAGE IMPACT CALCULATOR ====================
 * Real-time cost estimation of outages by industry and household impact
 */

/**
 * Calculate total economic impact of an outage
 * Formula: (affected_customers × avg_income_per_hour × hours_lost) + industry_multipliers
 * @param {number} affectedCustomers - Number of customers affected
 * @param {number} durationHours - Duration in hours
 * @param {Array} industries - Array of industry types present
 * @returns {Object} Impact breakdown and total cost
 */
function calculateOutageImpact(affectedCustomers, durationHours, industries = ['residential']) {
    const avgIncomePerHour = 45; // Nashville average household hourly impact
    
    // Base cost calculation
    let baseCost = affectedCustomers * avgIncomePerHour * durationHours;
    
    // Calculate industry multipliers
    let industryMultiplier = 1;
    let industryBreakdown = {};
    
    industries.forEach(industry => {
        const data = INDUSTRY_DATA[industry.toLowerCase()];
        if (data) {
            const multiplier = data.weight;
            const share = 1 / industries.length; // Equal share if multiple industries
            const costForIndustry = baseCost * share * multiplier;
            industryBreakdown[industry] = {
                name: data.name,
                multiplier: multiplier,
                estimatedCost: Math.round(costForIndustry)
            };
            industryMultiplier = (industryMultiplier + multiplier) / 2;
        }
    });
    
    const totalCost = Math.round(baseCost * industryMultiplier);
    
    // Family impact calculation: estimate from customers
    const estimatedFamilies = Math.round(affectedCustomers * 0.08); // 8% of customers are businesses
    const estimatedPeople = affectedCustomers * 3.5; // Average household size
    
    return {
        totalCost: totalCost,
        baseCost: Math.round(baseCost),
        industriesAffected: industries,
        industryBreakdown: industryBreakdown,
        affectedCustomers: affectedCustomers,
        durationHours: durationHours,
        estimatedFamilies: estimatedFamilies,
        estimatedPeople: estimatedPeople,
        formattedCost: `$${(totalCost / 1000000).toFixed(1)}M`,
        peakHourMultiplier: getTimeOfDayMultiplier(new Date()) // Peak hours cost more
    };
}

/**
 * Get time-of-day cost multiplier (peak hours 2-4 PM cost 2x)
 * @param {Date} date - Date/time to evaluate
 * @returns {number} Multiplier (1.0 = normal, 2.0 = peak)
 */
function getTimeOfDayMultiplier(date = new Date()) {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Peak hours: 2 PM - 4 PM (14:00 - 16:00) on weekdays
    if ((hour >= 14 && hour < 16) && dayOfWeek >= 1 && dayOfWeek <= 5) {
        return 2.0;
    }
    
    // Off-peak hours: 11 PM - 6 AM
    if (hour >= 23 || hour < 6) {
        return 0.6;
    }
    
    // Normal hours
    return 1.0;
}

/**
 * Get formatted impact summary string
 * @param {Object} impact - Impact object from calculateOutageImpact
 * @returns {string} Readable summary
 */
function getImpactSummary(impact) {
    return `This ${impact.durationHours.toFixed(1)}hr outage will cost Nashville ${impact.formattedCost} | ` +
           `${impact.estimatedFamilies.toLocaleString()} families (~${impact.estimatedPeople.toLocaleString()} people) affected`;
}

/**
 * ==================== FEATURE 2: SEVERITY SCORE (1-10 RANKING) ====================
 * Quick visual severity ranking based on multiple factors
 */

/**
 * Calculate comprehensive severity score (1-10)
 * Formula combines: customers (0-5) + duration (0-2) + trend (0-1) + time_of_day (0-2)
 * @param {Object} outage - Outage object with numPeople, estimated_eta, trend, timestamp
 * @param {Array} recentOutages - Recent outages for trend analysis
 * @returns {Object} Severity score and components
 */
function calculateSeverityScore(outage, recentOutages = []) {
    let score = 0;
    const components = {};
    
    // Component 1: Base on customers affected (0-5 scale)
    const customersNormalized = Math.min(outage.numPeople / 50000, 5);
    const customerScore = customersNormalized;
    components.customers = customerScore;
    score += customerScore;
    
    // Component 2: Duration estimate (0-2 scale)
    const estimatedHours = outage.estimated_eta ? 
        (new Date(outage.estimated_eta) - new Date(outage.startTime)) / (1000 * 60 * 60) : 2;
    const durationScore = Math.min((estimatedHours / 6) * 2, 2);
    components.duration = durationScore;
    score += durationScore;
    
    // Component 3: Trend analysis (0-1 scale)
    let trendScore = 0;
    if (outage.trend === 'worsening') {
        trendScore = 1.0;
    } else if (outage.trend === 'stable') {
        trendScore = 0.3;
    } else if (outage.trend === 'improving') {
        trendScore = 0;
    }
    components.trend = trendScore;
    score += trendScore;
    
    // Component 4: Time of day multiplier (0-2 scale)
    const timeMultiplier = getTimeOfDayMultiplier(new Date(outage.startTime));
    const timeScore = timeMultiplier > 1.5 ? 2 : timeMultiplier > 1 ? 1.5 : 0.5;
    components.timeOfDay = timeScore;
    score += timeScore;
    
    // Cap at 10
    score = Math.min(score, 10);
    
    return {
        score: Math.round(score * 10) / 10,
        severity: score >= 7 ? 'SEVERE' : score >= 5 ? 'HIGH' : score >= 3 ? 'MODERATE' : 'LOW',
        badge: `⚠️ ${Math.round(score)}/10 ${score >= 7 ? 'SEVERE' : score >= 5 ? 'HIGH' : 'MODERATE'}`,
        color: score >= 7 ? '#EF4444' : score >= 5 ? '#F97316' : '#F59E0B',
        components: components,
        reasoning: getSeverityReasoning(components, outage)
    };
}

/**
 * Generate human-readable reasoning for severity score
 * @param {Object} components - Score components breakdown
 * @param {Object} outage - Original outage object
 * @returns {string} Readable explanation
 */
function getSeverityReasoning(components, outage) {
    const reasons = [];
    
    if (components.customers > 3) reasons.push('Large number of customers affected');
    if (components.duration > 1.5) reasons.push('Extended duration expected');
    if (components.trend > 0.5) reasons.push(`Situation is ${outage.trend}`);
    if (components.timeOfDay > 1) reasons.push('Occurred during peak hours');
    
    return reasons.length > 0 ? reasons.join(' + ') : 'Low impact incident';
}

/**
 * Get badge color based on severity
 * @param {number} score - Severity score (0-10)
 * @returns {string} CSS color or hex value
 */
function getSeverityColor(score) {
    if (score >= 7) return '#EF4444';      // Red
    if (score >= 5) return '#F97316';      // Orange
    if (score >= 3) return '#F59E0B';      // Amber
    return '#10B981';                      // Green
}

/**
 * ==================== FEATURE 4: OUTAGE SIMILARITY MATCHING ====================
 * Compare current outages to historical patterns
 */

/**
 * Calculate similarity between two outages (0-1 scale)
 * Metrics: location, time_of_day, weather, customer_count, cause
 * @param {Object} current - Current outage
 * @param {Object} historical - Historical outage for comparison
 * @returns {number} Similarity score (0-1)
 */
function calculateOutageSimilarity(current, historical) {
    let similarities = [];
    
    // Location similarity (zip code match)
    const locationMatch = current.zipCode === historical.zipCode ? 1 : 
                         getZipCodeDistance(current.zipCode, historical.zipCode) < 5 ? 0.5 : 0;
    similarities.push(locationMatch * 0.25);
    
    // Time of day similarity (within 2-hour window)
    const currentHour = new Date(current.startTime).getHours();
    const historicalHour = new Date(historical.startTime).getHours();
    const hourDiff = Math.abs(currentHour - historicalHour);
    const timeMatch = hourDiff <= 2 ? 1 : hourDiff <= 4 ? 0.5 : 0;
    similarities.push(timeMatch * 0.2);
    
    // Customer count similarity (within 20%)
    const customerRatio = current.numPeople / historical.numPeople;
    const customerMatch = customerRatio >= 0.8 && customerRatio <= 1.2 ? 1 : 
                         customerRatio >= 0.5 && customerRatio <= 1.5 ? 0.6 : 0.2;
    similarities.push(customerMatch * 0.3);
    
    // Cause similarity
    const causeMatch = (current.cause === historical.cause) ? 1 : 0.2;
    similarities.push(causeMatch * 0.25);
    
    return similarities.reduce((a, b) => a + b, 0);
}

/**
 * Get approximate distance between two zip codes
 * @param {string} zip1 - First zip code
 * @param {string} zip2 - Second zip code
 * @returns {number} Approximate distance in miles
 */
function getZipCodeDistance(zip1, zip2) {
    const z1 = NASHVILLE_ZIP_CODES[zip1];
    const z2 = NASHVILLE_ZIP_CODES[zip2];
    
    if (!z1 || !z2) return 999;
    
    // Simple distance calculation in degrees (rough approximation)
    const dist = Math.sqrt(Math.pow(z1.lat - z2.lat, 2) + Math.pow(z1.lon - z2.lon, 2));
    return Math.round(dist * 70); // Convert to approximate miles
}

/**
 * Find similar outages in history
 * @param {Object} currentOutage - Current outage to match
 * @param {Array} historyData - All historical outages
 * @param {number} limit - Number of results to return
 * @returns {Array} Top N similar outages with confidence
 */
function findSimilarOutages(currentOutage, historyData = [], limit = 3) {
    if (!historyData || historyData.length === 0) return [];
    
    const similarities = historyData
        .filter(h => h !== currentOutage) // Exclude current
        .map(h => ({
            outage: h,
            similarity: calculateOutageSimilarity(currentOutage, h),
            confidence: Math.round(calculateOutageSimilarity(currentOutage, h) * 100),
            avgDuration: ((h.lastUpdatedTime - new Date(h.startTime)) / (1000 * 60 * 60)).toFixed(2),
            when: new Date(h.startTime).toLocaleDateString()
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    
    return similarities;
}

/**
 * ==================== FEATURE 5: NEIGHBORHOOD SAFETY SCORECARD ====================
 * Reliability score and trend analysis by neighborhood
 */

/**
 * Calculate neighborhood reliability score
 * 100 - (frequency_penalty + duration_penalty + recent_incidents_penalty)
 * @param {Object} areaStats - Area statistics with outages, avgDuration, etc
 * @param {Array} historyData - All historical data for recent incidents
 * @param {string} zipCode - Zip code for filtering recent incidents
 * @returns {Object} Scorecard with score and trend
 */
function calculateNeighborhoodSafetyScore(areaStats, historyData = [], zipCode = null) {
    // Frequency penalty (0-40 points)
    const frequencyPenalty = Math.min(areaStats.outages * 3, 40);
    
    // Duration penalty (0-35 points)
    const avgDurationHours = areaStats.avgDuration || (areaStats.totalDuration / areaStats.outages);
    const durationPenalty = Math.min((avgDurationHours / 8) * 35, 35);
    
    // Recent incidents penalty (0-25 points) - outages in last 30 days
    let recentIncidents = 0;
    if (historyData.length > 0 && zipCode) {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        recentIncidents = historyData.filter(e => 
            e.zipCode === zipCode && new Date(e.startTime).getTime() > thirtyDaysAgo
        ).length;
    }
    const recentPenalty = Math.min(recentIncidents * 5, 25);
    
    const score = Math.max(0, 100 - frequencyPenalty - durationPenalty - recentPenalty);
    
    return {
        score: Math.round(score),
        trend: 'stable', // Would calculate from historical data in real implementation
        color: score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444',
        rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Poor',
        components: {
            frequencyPenalty: Math.round(frequencyPenalty),
            durationPenalty: Math.round(durationPenalty),
            recentPenalty: Math.round(recentPenalty)
        },
        monthlyTrend: (areaStats.monthlyChange || 0).toFixed(1) + '%'
    };
}

/**
 * Build complete neighborhood scorecard
 * @param {Array} historyData - Historical outage data
 * @returns {Array} Array of neighborhood scorecards
 */
function generateNeighborhoodScorecards(historyData = []) {
    const areaStats = {};
    
    // Aggregate statistics by zip code
    historyData.forEach(entry => {
        const zip = entry.zipCode || 'unknown';
        if (!areaStats[zip]) {
            areaStats[zip] = {
                zip: zip,
                name: getNeighborhoodName(zip),
                outages: 0,
                totalDuration: 0,
                totalAffected: 0,
                lastOutage: null
            };
        }
        
        const duration = (entry.lastUpdatedTime - new Date(entry.startTime)) / (1000 * 60 * 60);
        areaStats[zip].outages++;
        areaStats[zip].totalDuration += duration;
        areaStats[zip].totalAffected += entry.numPeople;
        
        const lastTime = new Date(entry.startTime).getTime();
        if (!areaStats[zip].lastOutage || lastTime > areaStats[zip].lastOutage) {
            areaStats[zip].lastOutage = lastTime;
        }
    });
    
    // Calculate scores and return sorted
    return Object.values(areaStats)
        .map(stats => ({
            ...stats,
            avgDuration: (stats.totalDuration / stats.outages).toFixed(2),
            avgAffected: Math.round(stats.totalAffected / stats.outages),
            scorecard: calculateNeighborhoodSafetyScore(stats, historyData, stats.zip)
        }))
        .sort((a, b) => b.scorecard.score - a.scorecard.score);
}

/**
 * Get 30/90/1-year trend for a neighborhood
 * @param {string} zipCode - Zip code to analyze
 * @param {Array} historyData - Historical data
 * @returns {Object} Trend data for multiple periods
 */
function getNeighborhoodTrends(zipCode, historyData = []) {
    const now = Date.now();
    const periods = {
        '30-day': 30,
        '90-day': 90,
        '1-year': 365
    };
    
    const trends = {};
    
    Object.entries(periods).forEach(([label, days]) => {
        const start = now - (days * 24 * 60 * 60 * 1000);
        const filtered = historyData.filter(e => 
            e.zipCode === zipCode && new Date(e.startTime).getTime() > start
        );
        
        trends[label] = {
            outageCount: filtered.length,
            totalAffected: filtered.reduce((sum, e) => sum + e.numPeople, 0),
            avgDuration: filtered.length > 0 ? 
                (filtered.reduce((sum, e) => sum + (e.lastUpdatedTime - new Date(e.startTime)), 0) / filtered.length / (1000 * 60 * 60)).toFixed(2) : 0
        };
    });
    
    return trends;
}

/**
 * Export neighborhood scorecard to CSV
 * @param {Array} scorecards - Array from generateNeighborhoodScorecards
 * @returns {string} CSV content
 */
function exportScorecardToCSV(scorecards) {
    const headers = ['Neighborhood', 'Zip Code', 'Reliability Score', 'Rating', 'Outages (30-day)', 'Avg Duration (hrs)', 'People Affected (Avg)'];
    const rows = [];
    
    scorecards.forEach(sc => {
        rows.push([
            sc.name,
            sc.zip,
            sc.scorecard.score,
            sc.scorecard.rating,
            sc.outages,
            sc.avgDuration,
            sc.avgAffected
        ]);
    });
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csv;
}

/**
 * ==================== SMS/EMAIL ALERT UTILITIES (Twilio Integration) ====================
 */

/**
 * Twilio SMS alert templates
 */
const ALERT_TEMPLATES = {
    new_outage: (area, customersAffected, zipCode) => 
        `🚨 New outage detected: ${area}, ${customersAffected.toLocaleString()} customers affected (${zipCode})`,
    
    power_restored: (area, time, zipCode) => 
        `✅ Power restored in your area ${zipCode} at ${time}`,
    
    crew_assigned: (area, eta, zipCode) => 
        `👷 Crews assigned to your outage in ${area}, expect power in ${eta}`,
    
    eta_update: (area, newEta, zipCode) => 
        `⏱️ Updated ETA for ${area}: Power expected by ${newEta}`
};

/**
 * SMS carriers for Twilio backend
 */
const SMS_CARRIERS = {
    'ATT': 'AT&T',
    'TMOBILE': 'T-Mobile',
    'VERIZON': 'Verizon',
    'SPRINT': 'Sprint',
    'OTHER': 'Other'
};

/**
 * Get Twilio API payload for SMS alert
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} alertType - Type of alert (new_outage, power_restored, crew_assigned, eta_update)
 * @param {Object} alertData - Alert data object
 * @returns {Object} Twilio API payload
 */
function getTwilioPayload(phoneNumber, alertType, alertData) {
    const message = ALERT_TEMPLATES[alertType]?.(
        alertData.area || 'Your area',
        alertData.customersAffected || 0,
        alertData.zipCode || ''
    ) || 'Power outage notification from NES';

    return {
        From: 'NES-OUTAGE',
        To: phoneNumber,
        Body: message,
        MediaUrl: [],
        Tags: ['nes-outage', alertType],
        Timestamp: new Date().toISOString(),
        AlertType: alertType,
        Area: alertData.area || '',
        ZipCode: alertData.zipCode || '',
        Meta: alertData
    };
}

/**
 * Send test SMS alert (simulated - logs to console, ready for Twilio)
 * @param {string} phoneNumber - Test phone number
 * @param {string} carrier - Carrier info (for backend)
 * @returns {Object} Simulated response
 */
function sendTestAlert(phoneNumber, carrier = 'OTHER') {
    const testPayload = getTwilioPayload(phoneNumber, 'power_restored', {
        area: 'Downtown/Capitol Hill',
        zipCode: '37201',
        time: new Date().toLocaleTimeString()
    });

    console.log('📱 [TWILIO SMS TEST]', {
        timestamp: new Date().toISOString(),
        phoneNumber,
        carrier,
        payload: testPayload,
        status: 'SIMULATED - Ready for backend integration'
    });

    const recentAlerts = JSON.parse(localStorage.getItem('nes-recent-alerts') || '[]');
    recentAlerts.unshift({
        id: Date.now(),
        type: 'sms',
        phoneNumber,
        message: testPayload.Body,
        timestamp: new Date().toISOString(),
        status: 'TEST'
    });
    localStorage.setItem('nes-recent-alerts', JSON.stringify(recentAlerts.slice(0, 50)));

    return {
        success: true,
        message: `Test SMS sent to ${phoneNumber}`,
        payload: testPayload,
        status: 'SIMULATED'
    };
}

/**
 * Send test email alert (simulated)
 * @param {string} email - Test email address
 * @param {string} digestType - daily, weekly, or monthly
 * @returns {Object} Simulated response
 */
function sendTestEmail(email, digestType = 'daily') {
    const digestTemplates = {
        daily: {
            subject: '📊 NES Daily Outage Summary - Today',
            body: 'What happened in your area today:\n\n- 2 outages detected\n- Avg duration: 42 minutes\n- Total customers affected: 3,200\n\nTop affected areas: Downtown (37201), North Nashville (37202)'
        },
        weekly: {
            subject: '📈 NES Weekly Reliability Report',
            body: 'Top 5 neighborhood statistics this week:\n\n1. Downtown (37201): 3 outages, avg 45 min\n2. East Nashville (37203): 2 outages, avg 38 min\n3. Antioch (37210): 2 outages, avg 52 min\n4. North Nashville (37202): 1 outage, avg 30 min\n5. Sylvan Park (37205): 1 outage, avg 28 min'
        },
        monthly: {
            subject: '📋 NES Monthly Reliability Report - January 2024',
            body: 'Reliability metrics for your area (37201):\n\nTotal outages: 8\nAverage duration: 41 minutes\nCustomers affected: 24,500\nReliability score: 92/100 (Excellent)\n\nComparison to city average: 15% better than average'
        }
    };

    const emailContent = digestTemplates[digestType] || digestTemplates.daily;

    console.log('📧 [EMAIL DIGEST TEST]', {
        timestamp: new Date().toISOString(),
        email,
        digestType,
        subject: emailContent.subject,
        body: emailContent.body,
        status: 'SIMULATED - Ready for backend integration'
    });

    const recentAlerts = JSON.parse(localStorage.getItem('nes-recent-alerts') || '[]');
    recentAlerts.unshift({
        id: Date.now(),
        type: 'email',
        email,
        subject: emailContent.subject,
        digestType,
        timestamp: new Date().toISOString(),
        status: 'TEST'
    });
    localStorage.setItem('nes-recent-alerts', JSON.stringify(recentAlerts.slice(0, 50)));

    return {
        success: true,
        message: `Test ${digestType} email sent to ${email}`,
        payload: emailContent,
        status: 'SIMULATED'
    };
}

/**
 * ==================== GRID HEALTH UTILITIES ====================
 */

/**
 * Generate realistic mock grid health status
 * @param {Object} options - Optional overrides
 * @returns {Object} Grid health metrics
 */
function generateGridHealthStatus(options = {}) {
    const baseFreq = 60.00 + (Math.random() - 0.5) * 0.15;
    const baseVoltage = 239 + (Math.random() - 0.5) * 8;
    const baseLoad = 65 + Math.random() * 20;
    const baseTransformer = 60 + Math.random() * 15;

    const frequency = parseFloat(baseFreq.toFixed(2));
    const voltage = parseFloat(baseVoltage.toFixed(1));
    const loadPercentage = Math.round(baseLoad);
    const transformerUtilization = Math.round(baseTransformer);
    const activeOutages = Math.floor(Math.random() * 5) + 1;
    
    let gridStatus = 'STABLE';
    let alerts = [];

    if (frequency < 59.95 || frequency > 60.05) {
        gridStatus = 'STRESSED';
        alerts.push(`⚠️ Frequency drift detected: ${frequency} Hz`);
    }
    
    if (voltage < 228 || voltage > 252) {
        gridStatus = 'STRESSED';
        alerts.push(`⚠️ Voltage out of safe range: ${voltage}V`);
    }
    
    if (loadPercentage > 85) {
        gridStatus = 'STRESSED';
        alerts.push(`⚠️ High load detected: ${loadPercentage}%`);
    }
    
    if (frequency < 59.90 || frequency > 60.10 || voltage < 220 || voltage > 260 || loadPercentage > 95) {
        gridStatus = 'CRITICAL';
        alerts.push(`🚨 CRITICAL: Grid operating outside safe parameters`);
    }

    let recommendation = 'Grid operating normally';
    if (loadPercentage > 80) {
        recommendation = `High load detected. Likely more outages in next 1-2 hours`;
    }
    if (frequency < 59.95) {
        recommendation = `Frequency dropping - demand exceeding supply`;
    }

    return {
        timestamp: new Date().toISOString(),
        frequency,
        voltage,
        loadPercentage,
        transformerUtilization,
        activeOutages,
        gridStatus,
        alerts,
        recommendation,
        historicalTrend: generateGridHistoricalData()
    };
}

/**
 * Generate mock historical grid data (last 24 hours)
 * @returns {Array} Historical data points
 */
function generateGridHistoricalData(dataPoints = 24) {
    const data = [];
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    for (let i = dataPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now - i * hourMs);
        const hour = timestamp.getHours();
        const dayCycle = 0.5 + 0.3 * Math.sin((hour - 6) * Math.PI / 12);
        
        data.push({
            timestamp: timestamp.toISOString(),
            frequency: parseFloat((60.00 + (Math.random() - 0.5) * 0.1).toFixed(2)),
            voltage: parseFloat((239 + (Math.random() - 0.5) * 6).toFixed(1)),
            loadPercentage: Math.round(50 + dayCycle * 30 + (Math.random() - 0.5) * 10),
            transformerUtilization: Math.round(55 + dayCycle * 20 + (Math.random() - 0.5) * 8)
        });
    }

    return data;
}

/**
 * Calculate grid health color coding
 * Green: <70%, Yellow: 70-85%, Red: >85%
 * @param {number} percentage - Percentage value
 * @returns {Object} Color and status
 */
function getGridHealthColor(percentage) {
    if (percentage < 70) {
        return { color: '#10B981', status: 'NORMAL', label: 'Green' };
    } else if (percentage < 85) {
        return { color: '#F59E0B', status: 'WARNING', label: 'Yellow' };
    } else {
        return { color: '#EF4444', status: 'CRITICAL', label: 'Red' };
    }
}

/**
 * Get grid health metrics for dashboard summary
 * @param {Object} gridStatus - Grid status from generateGridHealthStatus()
 * @returns {Object} Formatted metrics for display
 */
function formatGridHealthMetrics(gridStatus) {
    return {
        frequency: {
            value: gridStatus.frequency,
            unit: 'Hz',
            normal: '59.9-60.1',
            actual: gridStatus.frequency,
            status: gridStatus.frequency >= 59.9 && gridStatus.frequency <= 60.1 ? '✅' : '⚠️'
        },
        voltage: {
            value: gridStatus.voltage,
            unit: 'V',
            normal: '230-250',
            actual: gridStatus.voltage,
            status: gridStatus.voltage >= 230 && gridStatus.voltage <= 250 ? '✅' : '⚠️'
        },
        load: {
            value: gridStatus.loadPercentage,
            unit: '%',
            normal: '<70%',
            actual: gridStatus.loadPercentage,
            color: getGridHealthColor(gridStatus.loadPercentage),
            status: gridStatus.loadPercentage < 70 ? '✅' : gridStatus.loadPercentage < 85 ? '⚠️' : '🚨'
        },
        transformer: {
            value: gridStatus.transformerUtilization,
            unit: '%',
            normal: '<75%',
            actual: gridStatus.transformerUtilization,
            color: getGridHealthColor(gridStatus.transformerUtilization),
            status: gridStatus.transformerUtilization < 75 ? '✅' : '⚠️'
        },
        outages: {
            value: gridStatus.activeOutages,
            unit: 'active',
            status: gridStatus.activeOutages <= 2 ? '✅' : gridStatus.activeOutages <= 5 ? '⚠️' : '🚨'
        }
    };
}

/**
 * CREW TRACKING SYSTEM
 * Manages crew locations, assignments, and ETA calculations
 */

// Mock crew depot location (Nashville main office)
const CREW_DEPOT = {
    lat: 36.1627,  // Downtown Nashville
    lon: -86.7816
};

/**
 * Generate simulated crew data based on assigned outages
 * Uses realistic crew deployment patterns
 * @param {Array} outages - List of outages
 * @param {number} crewDensity - Crews per 10 outages (default: 0.8)
 * @returns {Array} Array of crew objects with location and status
 */
function generateCrewLocations(outages, crewDensity = 0.8) {
    const assignedOutages = outages.filter(o => o.status === 'Assigned');
    const numCrews = Math.max(1, Math.ceil(assignedOutages.length * crewDensity));
    const crews = [];
    
    // Distribute crews across assigned outages
    for (let i = 0; i < numCrews; i++) {
        const crewId = 100 + i; // Crew IDs start at 100
        const assignedIndex = i % assignedOutages.length;
        const assignedOutage = assignedOutages[assignedIndex];
        
        // Simulate crew positioning (between depot and outage with some randomness)
        const progressToOutage = 0.3 + Math.random() * 0.5; // 30-80% of the way to outage
        const depotLat = CREW_DEPOT.lat;
        const depotLon = CREW_DEPOT.lon;
        const outageLatitude = assignedOutage.latitude;
        const outageLongitude = assignedOutage.longitude;
        
        const crewLat = depotLat + (outageLatitude - depotLat) * progressToOutage;
        const crewLon = depotLon + (outageLongitude - depotLon) * progressToOutage;
        
        crews.push({
            id: crewId,
            name: `Crew #${crewId}`,
            latitude: crewLat,
            longitude: crewLon,
            technicians: 2 + Math.floor(Math.random() * 3), // 2-4 technicians
            assignedOutageId: assignedOutage.id,
            assignedOutageLocation: assignedOutage.zipCode,
            status: 'en_route', // 'en_route', 'on_scene', 'completed'
            lastUpdated: new Date().toISOString(),
            efficiency: 0.7 + Math.random() * 0.3  // Historical efficiency 70-100%
        });
    }
    
    return crews;
}

/**
 * Calculate ETA from crew location to outage
 * Uses haversine formula for distance and assumes 25 mph average speed
 * @param {Object} crew - Crew object with lat/lon
 * @param {Object} outage - Outage object with lat/lon
 * @returns {Object} ETA info including minutes and confidence
 */
function calculateCrewETA(crew, outage) {
    // Haversine formula to calculate distance between two points
    const R = 3959; // Earth radius in miles
    const dLat = (outage.latitude - crew.latitude) * Math.PI / 180;
    const dLon = (outage.longitude - crew.longitude) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(crew.latitude * Math.PI / 180) * Math.cos(outage.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMiles = R * c;
    
    // Average speed: 25 mph (considering traffic, turn times, navigation)
    const avgSpeedMph = 25;
    const etaMinutes = Math.ceil((distanceMiles / avgSpeedMph) * 60);
    
    // Confidence: higher if crew is assigned vs estimated
    const confidence = crew.status === 'on_scene' ? 'arrived' : crew.status === 'en_route' ? 'high' : 'medium';
    
    return {
        distanceMiles: parseFloat(distanceMiles.toFixed(1)),
        etaMinutes: etaMinutes,
        confidence: confidence,
        arrived: crew.status === 'on_scene',
        estimatedArrival: new Date(Date.now() + etaMinutes * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
}

/**
 * Get comprehensive crew statistics
 * @param {Array} crews - Array of crew objects
 * @param {Array} outages - Array of outage objects
 * @returns {Object} Crew metrics and statistics
 */
function getCrewStats(crews, outages) {
    const assignedOutages = outages.filter(o => o.status === 'Assigned');
    const crewsOnScene = crews.filter(c => c.status === 'on_scene').length;
    const crewsEnRoute = crews.filter(c => c.status === 'en_route').length;
    const crewsCompleted = crews.filter(c => c.status === 'completed').length;
    
    // Calculate average response time (simulated based on status)
    const avgResponseTime = crewsEnRoute > 0 
        ? Math.round(5 + Math.random() * 10) // 5-15 minutes average
        : crewsOnScene > 0
        ? Math.round(15 + Math.random() * 10) // Already responded
        : 12;
    
    // Calculate average efficiency (issues resolved on first visit)
    const avgEfficiency = crews.length > 0 
        ? Math.round(crews.reduce((sum, c) => sum + c.efficiency, 0) / crews.length * 100)
        : 78;
    
    // Find busiest crew
    const busiestCrew = crews.reduce((busiest, crew) => {
        // Simulated: some crews have multiple assignments
        return crew.id > busiest.id ? crew : busiest;
    }, crews[0] || {});
    
    return {
        totalCrews: crews.length,
        crewsOnScene: crewsOnScene,
        crewsEnRoute: crewsEnRoute,
        crewsCompleted: crewsCompleted,
        assignedOutages: assignedOutages.length,
        avgResponseTime: avgResponseTime,
        avgEfficiency: avgEfficiency,
        busiestCrew: busiestCrew.name || 'N/A',
        busiestCrewAssignments: Math.ceil(assignedOutages.length / (crews.length || 1))
    };
}

/**
 * Cache crew data in localStorage for 60 seconds
 * @param {Array} crews - Crew data to cache
 * @param {string} key - Cache key (default: 'nes-crews')
 * @returns {Object} Cache object with crews and timestamp
 */
function cacheCrewData(crews, key = 'nes-crews') {
    const cacheObj = {
        crews: crews,
        timestamp: Date.now(),
        ttl: 60000 // 60 seconds
    };
    try {
        localStorage.setItem(key, JSON.stringify(cacheObj));
    } catch (err) {
        console.warn('Could not cache crew data:', err);
    }
    return cacheObj;
}

/**
 * Retrieve cached crew data if still fresh
 * @param {string} key - Cache key
 * @returns {Array|null} Crews array or null if expired/missing
 */
function getCachedCrewData(key = 'nes-crews') {
    try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            return cached.crews;
        }
    } catch (err) {
        console.warn('Could not retrieve cached crew data:', err);
    }
    return null;
}

/**
 * Simulate crew arrival at outage
 * Updates crew status based on distance
 * @param {Array} crews - Crew objects
 * @returns {Array} Updated crew objects
 */
function updateCrewStatus(crews) {
    return crews.map(crew => {
        const distance = crew.distanceMiles || 0;
        let newStatus = crew.status;
        
        if (distance < 0.1 && crew.status === 'en_route') {
            newStatus = 'on_scene';
        } else if (crew.status === 'on_scene' && Math.random() > 0.8) {
            // 20% chance crew completes per update
            newStatus = 'completed';
        }
        
        return {
            ...crew,
            status: newStatus,
            lastUpdated: new Date().toISOString()
        };
    });
}

/**
 * Generate crew timeline events for an outage
 * @param {Object} outage - Outage object
 * @param {Object} crew - Crew object assigned to outage
 * @returns {Array} Timeline events
 */
function generateCrewTimeline(outage, crew) {
    const startTime = new Date(outage.startTime);
    const now = new Date();
    const timeElapsed = now - startTime;
    const tenMinutes = 10 * 60 * 1000;
    const twentyMinutes = 20 * 60 * 1000;
    
    const events = [];
    
    // Outage started
    events.push({
        time: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        event: 'Outage reported',
        icon: '🔴'
    });
    
    // Crew assigned (if it happened)
    if (timeElapsed > 0) {
        const assignedTime = new Date(startTime.getTime() + 2 * 60 * 1000);
        events.push({
            time: assignedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            event: `${crew.name} assigned (${crew.technicians} technicians)`,
            icon: '📋'
        });
    }
    
    // Crew arrived (if applicable)
    if (crew.status === 'on_scene' || crew.status === 'completed') {
        const arrivedTime = new Date(startTime.getTime() + tenMinutes);
        events.push({
            time: arrivedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            event: `${crew.name} arrived on scene`,
            icon: '🚛'
        });
    }
    
    // Power restored (if completed)
    if (crew.status === 'completed') {
        const restoredTime = new Date(startTime.getTime() + twentyMinutes);
        events.push({
            time: restoredTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            event: `Power restored by ${crew.name}`,
            icon: '✅'
        });
    }
    
    return events;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Original exports
        NASHVILLE_ZIP_CODES,
        reverseGeocodeToZip,
        getNeighborhoodName,
        findClosestZipCode,
        getZipCodeForEvent,
        calculateReliabilityScore,
        compareToAverage,
        exportToCSV,
        getHourlyDistribution,
        getMonthlySummary,
        findWorstMonth,
        filterByDateRange,
        filterByCause,
        filterBySeverity,
        filterByImpact,
        searchByArea,
        getOutageTimeline,
        getDayOfWeekDistribution,
        calculateTrend,
        getWorstNeighborhoods,
        getSeasonalAnalysis,
        generateAdvancedAnalytics,
        
        // New feature exports
        INDUSTRY_DATA,
        HOURLY_IMPACT_COST,
        calculateOutageImpact,
        getTimeOfDayMultiplier,
        getImpactSummary,
        calculateSeverityScore,
        getSeverityReasoning,
        getSeverityColor,
        calculateOutageSimilarity,
        getZipCodeDistance,
        findSimilarOutages,
        calculateNeighborhoodSafetyScore,
        generateNeighborhoodScorecards,
        getNeighborhoodTrends,
        exportScorecardToCSV,
        
        // SMS/Email alert exports
        ALERT_TEMPLATES,
        SMS_CARRIERS,
        getTwilioPayload,
        sendTestAlert,
        sendTestEmail,
        
        // Grid health exports
        generateGridHealthStatus,
        generateGridHistoricalData,
        getGridHealthColor,
        formatGridHealthMetrics,
        
        // Crew tracking exports
        generateCrewLocations,
        calculateCrewETA,
        getCrewStats,
        cacheCrewData,
        getCachedCrewData,
        updateCrewStatus,
        generateCrewTimeline,
        CREW_DEPOT
    };
}
