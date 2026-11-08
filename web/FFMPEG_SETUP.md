# FFmpeg Setup Guide (LEGACY)

> **⚠️ IMPORTANT: This document is for legacy deployments only.**
> 
> **For Vercel deployment, FFmpeg is no longer needed. The application now uses smart content detection and automatic fallback routing.**

## 🚀 **Vercel Users: You're All Set!**

If you're deploying to Vercel:
- ✅ **No FFmpeg installation needed**
- ✅ **Automatic content compatibility detection**
- ✅ **Smart fallback routing**
- ✅ **Fully serverless-compatible**

Visit `/api/transcode/test` to see your environment status.

## 📚 **For Non-Vercel Deployments**

This guide is only needed if you're deploying to a traditional server or platform that supports FFmpeg installation.

## Overview
This application can use FFmpeg for transcoding video files that aren't natively supported by browsers (like MKV, HEVC, etc.) into browser-compatible MP4 format.

**Note**: The Vercel-compatible version automatically detects browser compatibility and streams content directly when possible, eliminating the need for transcoding in most cases.

## Installation

### Automatic Installation (Recommended)
The app automatically installs FFmpeg via `@ffmpeg-installer/ffmpeg` package. This should work out of the box on traditional servers.

### Manual Installation
If automatic installation fails, you can manually install FFmpeg:

#### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your PATH environment variable
4. Or set `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe` in your environment

#### macOS
```bash
# Using Homebrew
brew install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

## Environment Variables

You can set these environment variables to override automatic detection:

```bash
# Set custom FFmpeg path
FFMPEG_PATH=/path/to/ffmpeg

# Example for Windows
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
```

## Testing FFmpeg

Visit `/api/transcode/test` to check if FFmpeg is working properly. This endpoint will:

1. Check if FFmpeg is available
2. Verify the binary path
3. Test FFmpeg version
4. Confirm codec support

## Troubleshooting

### Common Issues

1. **"FFmpeg not available" error**
   - Check if FFmpeg is installed
   - Verify PATH environment variable
   - Try setting `FFMPEG_PATH` explicitly

2. **"spawn ENOENT" error**
   - FFmpeg binary not found at expected path
   - Check file permissions
   - Verify binary is executable

3. **Transcoding fails**
   - Check FFmpeg supports required codecs (libx264, aac)
   - Verify input URL is accessible
   - Check server logs for detailed error messages

4. **Memory issues**
   - Large video files may cause memory problems
   - Consider using lower quality presets
   - Monitor server memory usage

### Debug Mode

Enable debug logging by checking the server console. The transcoding route logs:
- FFmpeg path being used
- Command arguments
- Process events (start, exit, error)
- Stream handling events

### Performance Optimization

For better performance:
- Use `-preset veryfast` (already configured)
- Consider `-crf 28` for lower quality but faster encoding
- Monitor CPU usage during transcoding
- Use hardware acceleration if available (`-hwaccel auto`)

## Codec Support

The transcoding route is configured to output:
- **Video**: H.264 (libx264) with baseline profile
- **Audio**: AAC at 128kbps
- **Container**: MP4 with fast start flags

This ensures maximum browser compatibility while maintaining reasonable quality.

## Security Notes

- Only HTTPS URLs are accepted for input
- Input validation prevents path traversal attacks
- Process isolation prevents command injection
- Timeout handling prevents hanging processes

## Migration to Vercel

If you're migrating from a traditional server to Vercel:

1. **Remove FFmpeg dependency**: `npm uninstall @ffmpeg-installer/ffmpeg`
2. **Update package.json**: Remove FFmpeg-related packages
3. **Deploy to Vercel**: The app automatically detects the environment
4. **Test endpoints**: Use `/api/transcode/test` to verify compatibility

## Support

- **Vercel users**: Check `/api/transcode/test` for environment status
- **Traditional server users**: Follow this guide for FFmpeg setup
- **General issues**: Refer to `VERCEL_TROUBLESHOOTING.md`

---

**Remember**: For Vercel deployment, FFmpeg is not needed. The application automatically handles content compatibility and provides reliable streaming for all video formats! 🎉
