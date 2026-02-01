# NES Outage Checker - Part 1: Core Analytics Engine

## Features Implemented

### 1. Outage Impact Calculator
- **Description**: Real-time cost estimation of outages
- **Formula**: (affected_customers × avg_income_per_hour × hours_lost) + industry_multipliers
- **Features**:
  - By-industry breakdown (hospitals, retail, manufacturing, etc.)
  - Family impact calculation: affected families and estimated people
  - Time-based multiplier: peak hours (2-4 PM) cost 2x
  - Display: Info card in popup when clicking outage on map
- **Functions Added**:
  - `calculateOutageImpact()` - Main calculation engine
  - `getTimeOfDayMultiplier()` - Peak hour pricing
  - `getImpactSummary()` - Formatted display string
- **Files Modified**: shared-data.js, all.html

### 2. Severity Score (1-10 Ranking)
- **Description**: Quick visual severity ranking for every outage
- **Formula Components**:
  - Base: affected_customers (scaled to 0-5)
  - Duration: estimated_eta (0-2)
  - Trend: worsening/stable/improving (0-1)
  - Time_of_day: peak hours (0-2)
- **Display**: Badge in outage popup (e.g., "⚠️ 7/10 SEVERE")
- **Color Coding**: Red (7+), Orange (5-7), Yellow (3-5), Green (<3)
- **Functions Added**:
  - `calculateSeverityScore()` - Main scoring engine
  - `getSeverityReasoning()` - Human-readable explanation
  - `getSeverityColor()` - Color mapping
- **Files Modified**: shared-data.js, all.html

### 3. Incident Timeline (Minute-by-Minute)
- **Description**: New page showing timeline of outage events
- **Features**:
  - Vertical scrollable timeline with icons
  - Events: "2:00 PM - Fault detected → 2:02 PM - 400 lost power → 2:47 PM - Restored"
  - Filter by event type (NEW, UPDATED, RESOLVED)
  - Dark/light mode toggle
  - Customer count and status tracking
- **Data Sources**:
  - Fetch from API if available
  - Fallback: Generate timeline from event creation/update times
- **Files Created**: timeline.html
- **Files Modified**: all.html (added timeline link in popup)

### 4. Outage Similarity Matching
- **Description**: Compare current outages to historical patterns
- **Features**:
  - Show top 3 most similar historical incidents
  - Display: Card in stats.html under "Pattern Recognition"
  - Confidence percentage for each match
  - Metrics: location, time_of_day, customer_count, cause
- **Display Example**: "This outage matches Sept 2022 storms (87% similar) - avg 5.2 hours"
- **Functions Added**:
  - `calculateOutageSimilarity()` - Similarity algorithm
  - `findSimilarOutages()` - Search historical data
  - `getZipCodeDistance()` - Location-based matching
- **Files Modified**: shared-data.js, stats.html

### 5. Neighborhood Safety Scorecard
- **Description**: Reliability score and trend analysis by neighborhood
- **Features**:
  - Reliability Score: 100 - (frequency_penalty + duration_penalty + recent_incidents_penalty)
  - Display: "37201 Reliability Score: 78/100 (↓ 2% from last month)"
  - Color coding: Green (80+), Yellow (60-79), Red (<60)
  - Trend line: 30-day, 90-day, 1-year windows
  - CSV export per neighborhood
  - Share badge: "My neighborhood is 78/100 reliable"
- **Display Location**: New section in stats.html
- **Functions Added**:
  - `calculateNeighborhoodSafetyScore()` - Score calculation
  - `generateNeighborhoodScorecards()` - Build all neighborhood scores
  - `getNeighborhoodTrends()` - Trend analysis
  - `exportScorecardToCSV()` - CSV export
- **Files Modified**: shared-data.js, stats.html

## Implementation Details

### Client-Side Architecture
- All calculations are client-side (localStorage-based history)
- No server requests required for analytics
- Fast, responsive, privacy-preserving

### Data Storage
- Uses localStorage for outage history
- Manages graceful degradation when data is limited
- Falls back to mock data when necessary

### Visualization
- Uses existing Chart.js for trend visualizations
- Custom CSS for cards and badges
- Responsive design for mobile and desktop

## Files Modified
- `/docs/shared-data.js` - Added 8 new utility functions + industry data
- `/docs/all.html` - Added impact calculator and severity score to outage popups
- `/docs/stats.html` - Added pattern recognition and safety scorecard sections
- `/docs/timeline.html` - New page for incident timelines

## Git Commits
1. `feat: add outage impact calculator with cost estimation`
2. `feat: add severity scoring system (1-10 scale)`
3. `feat: add incident timeline page with minute-by-minute breakdown`
4. `feat: add outage similarity matching and pattern recognition`
5. `feat: add neighborhood safety scorecard`

All commits authored by: lobsterhash@gmail.com

## Timeline Feature
- Displays minute-by-minute incident progression
- Accessible from outage details via "View Timeline" link
- Mock timeline generation from event metadata

## Similarity Matching Feature
- Compare current outages against 30 years of historical data
- Match by location, time, customer count, and cause
- Display confidence percentages

## Neighborhood Safety Scorecard Feature
- 0-100 reliability score per neighborhood
- Penalties for frequency, duration, and recent incidents
- CSV export capability
- Color-coded ratings (green/yellow/red)
