// Gallery Backend - Secure Dropbox Integration
const express = require('express');
const { Dropbox } = require('dropbox');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Secure Dropbox configuration - NEVER expose token
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
const GALLERY_FOLDER = ''; // Root directory of Dropbox
const LOCAL_CACHE_DIR = path.join(__dirname, 'cached-photos');

// Security: Validate token format without exposing it
function validateDropboxToken() {
    if (!DROPBOX_ACCESS_TOKEN) {
        return false;
    }
    // Basic validation without exposing token
    return DROPBOX_ACCESS_TOKEN.length > 50 && DROPBOX_ACCESS_TOKEN.startsWith('sl.');
}

// Initialize Dropbox client securely
let dbx = null;
if (validateDropboxToken()) {
    dbx = new Dropbox({ 
        accessToken: DROPBOX_ACCESS_TOKEN,
        fetch: require('node-fetch') // Use node-fetch for better security
    });
    console.log('� Dro pbox client initialized securely');
} else {
    console.error('❌ Invalid or missing Dropbox access token');
}

// Ensure cache directory exists with proper permissions
if (!fs.existsSync(LOCAL_CACHE_DIR)) {
    fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true, mode: 0o755 });
    console.log('📁 Created secure cache directory');
}

// Security: Generate secure filename to prevent path traversal
function generateSecureFilename(originalName, fileId) {
    const ext = path.extname(originalName).toLowerCase();
    const hash = crypto.createHash('sha256').update(fileId + originalName).digest('hex').substring(0, 16);
    return `${hash}${ext}`;
}

/**
 * Get all photos from Dropbox securely - NO TOKEN EXPOSURE
 */
async function getPhotosFromDropbox() {
    if (!dbx) {
        throw new Error('Dropbox service unavailable. Please check configuration.');
    }

    try {
        console.log('🔒 Securely fetching photos from Dropbox...');
        console.log('📁 Looking in directory:', GALLERY_FOLDER || 'Root directory');
        
        // List all files in the root directory (or gallery folder)
        const response = await dbx.filesListFolder({ 
            path: GALLERY_FOLDER || '', // Use empty string for root directory
            recursive: false // Don't go into subdirectories
        });
        
        console.log(`📋 Found ${response.result.entries.length} total files in Dropbox`);
        
        // Filter for image files only
        const imageFiles = response.result.entries.filter(entry => 
            entry['.tag'] === 'file' && isImageFile(entry.name)
        );
        
        console.log(`📸 Found ${imageFiles.length} image files`);
        console.log('📸 Image files:', imageFiles.map(f => f.name));
        
        // Process each image file securely
        const photos = [];
        for (const file of imageFiles) {
            try {
                // Generate secure filename
                const secureFilename = generateSecureFilename(file.name, file.id);
                
                // Get temporary download link (expires in 4 hours)
                const downloadLink = await dbx.filesGetTemporaryLink({ path: file.path_lower });
                
                // Download and cache the image locally with secure filename
                const localPath = await downloadAndCacheImage(
                    downloadLink.result.link, 
                    secureFilename, 
                    file.id
                );
                
                // Create photo object with NO sensitive information
                const photo = {
                    id: crypto.createHash('sha256').update(file.id).digest('hex').substring(0, 16), // Hashed ID
                    name: path.basename(file.name, path.extname(file.name)), // Name without extension
                    title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                    url: `/cached-photos/${secureFilename}`, // Secure local path
                    thumbnail: `/cached-photos/${secureFilename}`, // Same as URL for now
                    size: formatFileSize(file.size),
                    dateModified: file.client_modified,
                    // NO path or sensitive Dropbox info exposed
                    localPath: localPath
                };
                
                photos.push(photo);
                console.log(`✅ Securely processed: ${file.name}`);
                
            } catch (error) {
                console.error(`❌ Error processing ${file.name}:`, error.message);
                // Continue processing other files
            }
        }
        
        // Sort by date modified (newest first)
        photos.sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified));
        
        console.log(`✅ Successfully processed ${photos.length} photos securely`);
        return photos;
        
    } catch (error) {
        console.error('❌ Secure fetch error:', error.message);
        // Don't expose detailed Dropbox errors to client
        throw new Error('Failed to fetch photos from secure storage');
    }
}

/**
 * Download image from URL and cache it locally with security measures
 */
function downloadAndCacheImage(url, secureFilename, fileId) {
    return new Promise((resolve, reject) => {
        const localPath = path.join(LOCAL_CACHE_DIR, secureFilename);
        
        // Security: Validate filename to prevent path traversal
        if (secureFilename.includes('..') || secureFilename.includes('/') || secureFilename.includes('\\')) {
            reject(new Error('Invalid filename detected'));
            return;
        }
        
        // Check if file already exists and is recent (less than 1 hour old)
        if (fs.existsSync(localPath)) {
            const stats = fs.statSync(localPath);
            const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (stats.mtime > hourAgo) {
                console.log(`📋 Using cached version: ${secureFilename}`);
                resolve(localPath);
                return;
            }
        }
        
        console.log(`⬇️ Securely downloading: ${secureFilename}`);
        
        const file = fs.createWriteStream(localPath, { mode: 0o644 }); // Secure file permissions
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed: ${response.statusCode}`));
                return;
            }
            
            // Security: Limit file size to prevent abuse
            const maxSize = 50 * 1024 * 1024; // 50MB limit
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (downloadedSize > maxSize) {
                    file.destroy();
                    fs.unlink(localPath, () => {});
                    reject(new Error('File too large'));
                    return;
                }
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`✅ Securely downloaded: ${secureFilename}`);
                resolve(localPath);
            });
            
            file.on('error', (error) => {
                fs.unlink(localPath, () => {}); // Delete partial file
                reject(error);
            });
            
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Check if file is an image (security validation)
 */
function isImageFile(fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const extension = path.extname(fileName).toLowerCase();
    return imageExtensions.includes(extension);
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean old cached files securely (older than 24 hours)
 */
function cleanOldCache() {
    try {
        if (!fs.existsSync(LOCAL_CACHE_DIR)) {
            return;
        }
        
        const files = fs.readdirSync(LOCAL_CACHE_DIR);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let cleanedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(LOCAL_CACHE_DIR, file);
            
            // Security: Validate file path
            if (!filePath.startsWith(LOCAL_CACHE_DIR)) {
                console.warn('⚠️ Suspicious file path detected, skipping:', file);
                return;
            }
            
            try {
                const stats = fs.statSync(filePath);
                if (stats.mtime < dayAgo) {
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                }
            } catch (error) {
                console.warn('⚠️ Error cleaning file:', file, error.message);
            }
        });
        
        if (cleanedCount > 0) {
            console.log(`🗑️ Securely cleaned ${cleanedCount} old cache files`);
        }
    } catch (error) {
        console.error('❌ Error during cache cleanup:', error.message);
    }
}

/**
 * Get secure status without exposing sensitive information
 */
function getSecureStatus() {
    return {
        dropboxConfigured: !!dbx,
        cacheDirectory: path.basename(LOCAL_CACHE_DIR), // Only show directory name, not full path
        tokenValid: validateDropboxToken(),
        // NO sensitive information exposed
    };
}

// Export functions for use in main server
module.exports = {
    getPhotosFromDropbox,
    cleanOldCache,
    getSecureStatus,
    LOCAL_CACHE_DIR,
    GALLERY_FOLDER: path.basename(GALLERY_FOLDER) // Only expose folder name
};