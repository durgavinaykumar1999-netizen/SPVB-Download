# SPVB Video Downloader - Backend

Social Media Video Downloader - Download videos from YouTube, Instagram, Facebook, Twitter, and TikTok

## Features

- 🎥 **Multi-Platform Support** - YouTube, Instagram, Facebook, Twitter, TikTok
- 📁 **Session-Based** - No login required, auto-cleanup after 30 minutes
- ☁️ **Cloud Storage** - MongoDB for metadata, Cloudinary for backups
- 📊 **Multiple Qualities** - Download in various resolutions (360p-1080p)
- 🚀 **Production Ready** - Deployed on Render.io

## Quick Start

### Prerequisites
- Python 3.8+
- MongoDB Atlas account (free)
- Cloudinary account (free)
- Render.io account (free)

### Local Development

1. **Clone repository**
   ```bash
   git clone https://github.com/durgavinaykumar1999-netizen/SPVB-Download.git
   cd SPVB-Download/backend_python
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Run backend**
   ```bash
   python main.py
   ```

   Server will start at: http://localhost:8000

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

Optional:
- `NODE_ENV` - development or production (default: development)
- `PORT` - Server port (default: 8000)
- `LOG_LEVEL` - Logging level (default: info)
- `DOWNLOAD_TIMEOUT` - Download timeout in ms (default: 900000)
- `DOWNLOAD_QUALITY` - Video quality (default: best)
- `VIDEO_FORMAT` - Video format (default: mp4)

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/session` - Create/get session
- `POST /api/metadata` - Fetch video metadata
- `POST /api/download` - Initiate download
- `GET /api/download/{id}` - Get download status
- `GET /api/downloads` - List all downloads
- `GET /api/download/{id}/file` - Download file
- `POST /api/session/end` - End session

## Deployment to Render

1. Push code to GitHub (includes render.yaml)
2. Go to https://render.com
3. Create new Web Service
4. Select this repository
5. Render auto-detects render.yaml
6. Add environment variables
7. Click Deploy

Render will automatically:
- Install dependencies
- Build application
- Start server
- Auto-deploy on git push

## Technology Stack

- **Framework:** FastAPI
- **Database:** MongoDB Atlas (Cloud)
- **Cloud Storage:** Cloudinary
- **Video Downloading:** yt-dlp, pytubefix, instaloader
- **Deployment:** Render.io

## License

MIT License

## Support

For issues and questions, please create an issue on GitHub.

---

**Status:** Production Ready ✅  
**Deployment:** Render.io  
**Last Updated:** August 2026
