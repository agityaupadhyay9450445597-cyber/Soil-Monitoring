# 📸 Plant Gallery Setup Guide

This guide will help you set up the Plant Gallery with Dropbox integration.

## 🚀 Quick Setup

### 1. Create Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access"
4. Choose "Full Dropbox" access
5. Name your app (e.g., "Plant Gallery")
6. Click "Create app"

### 2. Configure App Permissions

In your Dropbox app settings, enable these permissions:
- `files.metadata.read`
- `files.content.read`

### 3. Get Access Token

1. In your app settings, go to "Settings" tab
2. Scroll down to "Generated access token"
3. Click "Generate" to create a token
4. Copy the token

### 4. Set Environment Variable

**Windows (Command Prompt):**
```cmd
set DROPBOX_ACCESS_TOKEN=your_access_token_here
```

**Windows (PowerShell):**
```powershell
$env:DROPBOX_ACCESS_TOKEN="your_access_token_here"
```

**Or create a .env file:**
```env
DROPBOX_ACCESS_TOKEN=your_access_token_here
```

### 5. Create Plant Photos Folder

1. In your Dropbox, create a folder called `plant-photos`
2. Upload your plant photos to this folder
3. The gallery will automatically find and display them

### 6. Start the Server

```bash
npm run dev
```

## 📁 Folder Structure

The gallery expects this structure in your Dropbox:

```
/plant-photos/
├── IMG_001.jpg
├── IMG_002.png
├── plant_growth_day1.jpg
├── tomato_plants.jpg
└── soil_analysis.png
```

## 🎯 How It Works

1. **Frontend**: Gallery page calls `/api/gallery/photos`
2. **Backend**: Fetches photo list from Dropbox API
3. **Download**: Downloads temporary links and caches images locally
4. **Display**: Shows photos sorted by date (newest first)

## 🔧 API Endpoints

- `GET /api/gallery/photos` - Get all photos
- `GET /api/gallery/download/:id` - Download specific photo
- `POST /api/gallery/sync` - Manual sync with Dropbox
- `GET /api/gallery/health` - Check gallery status

## 📱 Usage

1. Click the "Gallery" button on your main dashboard
2. Gallery page opens in a new tab
3. Photos are automatically loaded from Dropbox
4. Click "Sync with Dropbox" to refresh
5. Click any photo to view full size

## 🔍 Troubleshooting

### "Dropbox not configured" Error
- Make sure `DROPBOX_ACCESS_TOKEN` environment variable is set
- Restart the server after setting the token

### "No photos found"
- Check that `/plant-photos` folder exists in your Dropbox
- Make sure the folder contains image files (.jpg, .png, .gif, etc.)
- Try clicking "Sync with Dropbox" button

### Photos not loading
- Check your internet connection
- Verify Dropbox access token is valid
- Check server console for error messages

## 🎨 Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## 🔒 Security Notes

- Keep your access token secure
- Don't commit tokens to version control
- Consider using OAuth2 flow for production
- Tokens can be revoked from Dropbox app console

## 📊 Features

✅ **Automatic photo sync from Dropbox**  
✅ **Local caching for faster loading**  
✅ **Date-based sorting (newest first)**  
✅ **Full-screen photo viewer**  
✅ **Photo statistics and counts**  
✅ **Manual sync button**  
✅ **Responsive design for mobile**  

---

**Need help?** Check the server console for detailed error messages and troubleshooting information.