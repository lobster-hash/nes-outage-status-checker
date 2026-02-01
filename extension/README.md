# NES Outage Checker - Chrome Extension

A lightweight Chrome extension that shows real-time Nashville Electric Service (NES) outage status right from your toolbar.

## Features

✅ **One-Click Status Check** - Click the icon to see current outage count
✅ **Live Badge Counter** - Extension icon displays number of active outages
✅ **Auto-Refresh** - Updates every 5 minutes automatically
✅ **Offline Support** - Shows cached data when offline
✅ **Dark/Light Mode** - Matches your OS theme
✅ **Minimal Permissions** - Only storage access required
✅ **Quick Links** - One-click access to full site and stats page

## Installation

### For Users (Developer Mode)

1. Download or clone this extension folder
2. Open Chrome and go to `chrome://extensions`
3. Enable **"Developer mode"** (toggle in top right)
4. Click **"Load unpacked"**
5. Select the `extension/` folder
6. Done! 🎉 Icon appears in your toolbar

### For Developers

```bash
# Clone the repo
git clone https://github.com/lobster-hash/nes-outage-status-checker
cd nes-outage-status-checker/extension

# Load in Chrome
# Then follow "For Users" instructions above
```

## Usage

1. **Click the extension icon** in your toolbar
2. **View current outage count** and affected areas
3. **Click "Open Full Site"** for detailed information
4. **Click "View Stats"** for historical data
5. **Refresh button** to force an immediate update

## Status Indicators

- 🟢 **Green** (0-5 outages) - Minimal impact
- 🟡 **Yellow** (6-20 outages) - Moderate impact  
- 🔴 **Red** (20+ outages) - Severe impact

## Popup Display

The popup shows:
- Current time and last update time
- Active outage count
- Top 3 affected areas with customer counts
- Quick action buttons

## Data Flow

```
Extension Startup
    ↓
Load cached data from storage
    ↓
Fetch fresh data every 5 minutes
    ↓
Update badge & storage
    ↓
Popup reads from storage when clicked
```

## Files

- `manifest.json` - Extension configuration (Manifest v3)
- `popup.html` - Popup UI layout
- `popup.js` - Popup logic and event handling
- `background.js` - Service worker for periodic updates
- `styles.css` - Responsive styling with dark mode
- `icons/` - SVG icons (16x16, 48x48, 128x128)

## API Integration

The extension fetches from the NES API endpoint (configurable in `CONFIG.API_URL`):

```javascript
// In popup.js and background.js
CONFIG.API_URL = 'https://api.nespower.com/outages'
```

Expected API response format:
```json
{
  "outages": [
    {
      "id": "outage_001",
      "zip_code": "37201",
      "area": "Downtown Nashville",
      "customers_affected": 245,
      "start_time": "2024-02-01T15:30:00Z",
      "estimated_restoration": "2024-02-01T18:00:00Z",
      "cause": "Equipment failure"
    }
  ]
}
```

## Configuration

Edit `CONFIG` in `popup.js` and `background.js`:

```javascript
const CONFIG = {
  STORAGE_KEY: 'nes_outage_data',
  UPDATE_INTERVAL_MS: 5 * 60 * 1000,  // 5 minutes
  API_URL: 'https://api.nespower.com/outages',
  TIMEOUT_MS: 10000
};
```

## Browser Support

- Chrome 88+
- Edge 88+
- Opera 74+
- Any Chromium-based browser supporting Manifest v3

## Permissions

- **storage** - Save/retrieve outage data
- **activeTab** - Determine current tab
- **scripting** - Execute scripts on pages

No excessive permissions required! ✅

## Offline Behavior

- Shows last cached data if API is unavailable
- Retries fetch every 5 minutes
- Displays "(cached)" indicator on timestamp
- Maintains functionality without internet

## Dark Mode

The extension automatically detects OS theme preference using `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}
```

## Development

### Local Testing

1. Make changes to any file
2. Go to `chrome://extensions`
3. Click the **refresh icon** on the NES Outage Checker card
4. Test in the popup

### Debugging

- Right-click extension icon → "Inspect popup"
- Go to `chrome://extensions` → NES Outage Checker → "Errors" to see service worker logs
- Open DevTools for popup: `Ctrl+Shift+J` (Windows) or `Cmd+Option+J` (Mac)

## Performance

- **Bundle size**: ~25KB (uncompressed)
- **Memory usage**: <5MB
- **API calls**: One every 5 minutes
- **Storage**: ~10KB for outage data

## Future Enhancements

- [ ] Notifications for new outages
- [ ] Map view in popup
- [ ] User-customizable zones
- [ ] Email alerts
- [ ] Historical trend analysis
- [ ] Weather correlation

## License

MIT License - See LICENSE file

## Support

For issues or feature requests, visit:
https://github.com/lobster-hash/nes-outage-status-checker/issues

## Credits

Built with ❤️ for Nashville residents
