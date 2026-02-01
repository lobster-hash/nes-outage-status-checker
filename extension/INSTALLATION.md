# Installation Guide - NES Outage Checker

## Quick Start (5 minutes)

### Step 1: Download the Extension
The extension is in the `extension/` folder of the repository.

### Step 2: Open Chrome Extensions Page
1. Open Chrome browser
2. Copy and paste into address bar: `chrome://extensions`
3. Press Enter

### Step 3: Enable Developer Mode
- Look for **"Developer mode"** toggle in the top right corner
- Click to enable (switch will turn blue)

### Step 4: Load Extension
1. Click the **"Load unpacked"** button
2. Navigate to and select the `extension/` folder
3. Click **"Select Folder"**

### Step 5: Verify Installation
- Extension icon should appear in your toolbar (top right)
- Icon shows: ⚡ (lightning bolt in blue circle)
- Click it to open the popup and see current outage status

## What You Should See

### In Toolbar
- Extension icon with outage count badge (e.g., "3" or "!")
- Tooltip: "NES Outage Status"

### When Clicked
- Popup showing:
  - 🔌 NES Status header
  - Current outage count
  - Top 3 affected areas
  - Last update time
  - "Open Full Site" button
  - "View Stats" button

## Troubleshooting

### Extension Not Showing?
1. Make sure Developer mode is enabled
2. Click "Load unpacked" again
3. Select the correct `extension/` folder (not parent directory)
4. Refresh the page if already open

### Icon Not Updating?
1. The extension updates every 5 minutes
2. Click the refresh button (⟳) in popup to force update
3. Check internet connection

### Popup Won't Open?
1. Right-click extension icon
2. Select "Inspect popup"
3. Check for errors in Console tab

### Permission Warnings?
This extension uses minimal permissions:
- ✅ Storage (save outage data locally)
- ✅ Active Tab (detect current page)
- ✅ Scripting (limited to host permissions)

No excessive permissions required!

## Uninstalling

1. Go to `chrome://extensions`
2. Find "NES Outage Checker"
3. Click the trash icon
4. Confirm removal

The extension is completely removed - no residual files.

## Developer Mode Warning

Chrome shows a warning about extensions in Developer mode. This is normal for unpacked extensions. Warnings will disappear if you:

1. Publish to Chrome Web Store (official only)
2. Distribute via enterprise policy
3. Use managed extensions in a domain

For personal/testing use, the warning is safe to ignore.

## Advanced: Local Development

### Editing Files
1. Edit any file in the `extension/` folder
2. Go back to `chrome://extensions`
3. Find NES Outage Checker
4. Click the refresh/reload icon
5. Test changes

### Checking Logs
**Popup errors:**
- Right-click extension icon → "Inspect popup"
- Check Console tab for messages

**Background service worker errors:**
- Go to `chrome://extensions`
- Find NES Outage Checker
- Click "Errors" link (if any)
- Or click "Details" → "Inspect views"

### Testing Offline
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Click extension icon
5. Should show cached data

## Configuration

To connect to your NES API, edit these files:

### popup.js (line ~10)
```javascript
CONFIG.API_URL = 'https://your-api-endpoint.com/outages'
CONFIG.SITE_URL = 'https://your-site.com'
```

### background.js (line ~10)
```javascript
CONFIG.API_URL = 'https://your-api-endpoint.com/outages'
CONFIG.UPDATE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
```

Then reload the extension.

## Next Steps

1. ✅ Install extension
2. ✅ Click icon to verify it works
3. ✅ Configure API endpoint (optional)
4. ✅ Share with others!

## Need Help?

See `README.md` for:
- Feature details
- API integration guide
- Troubleshooting
- Development info

## Pro Tips

💡 **Pin the extension to toolbar for quick access:**
1. Click the Extensions menu icon (puzzle piece)
2. Find NES Outage Checker
3. Click the pin icon

💡 **Use keyboard shortcut:**
- You can set a custom keyboard shortcut in Chrome settings
- Right-click extension → "Manage extension"
- Go to Chrome settings → Extensions → Keyboard shortcuts

💡 **Sync across devices:**
- Extension settings sync automatically if logged into Chrome
- Data persists across browser restarts
- Works offline with cached data
