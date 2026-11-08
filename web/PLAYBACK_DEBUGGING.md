# Playback Error Debugging Guide

## 🚨 **Common Playback Errors & Solutions**

### **Error: "Fallback extraction failed"**

This error occurs when the stream-fallback route cannot extract or stream video content. Here's how to fix it:

#### **Step 1: Test the URL Directly**
```bash
# Test if the URL is accessible
curl -I "YOUR_VIDEO_URL"

# Test with the stream-fallback test endpoint
curl "https://your-app.vercel.app/api/stream-fallback/test?url=YOUR_VIDEO_URL"
```

#### **Step 2: Check Common Issues**

**1. Cloudflare Protection**
- **Symptoms**: 403 Forbidden, 503 Service Unavailable
- **Solution**: The video source may be protected by Cloudflare
- **Workaround**: Try accessing the URL manually in a browser first

**2. Missing Headers**
- **Symptoms**: Content-Type missing or incorrect
- **Solution**: The video source may not provide proper headers
- **Workaround**: Use the transcode route which handles this automatically

**3. Authentication Required**
- **Symptoms**: 401 Unauthorized, 403 Forbidden
- **Solution**: The video may require cookies or authentication
- **Workaround**: Check if the video source needs login

**4. Region Restrictions**
- **Symptoms**: 403 Forbidden, 451 Unavailable For Legal Reasons
- **Solution**: The video may be geo-blocked
- **Workaround**: Try using a VPN or different region

#### **Step 3: Use Debug Endpoints**

**Test Environment:**
```bash
GET /api/transcode/test
```
Shows your Vercel environment status and compatibility.

**Test Stream-Fallback:**
```bash
GET /api/stream-fallback/test?url=YOUR_VIDEO_URL
```
Analyzes the video URL and provides detailed debugging information.

**Test Transcode Route:**
```bash
GET /api/transcode?url=YOUR_VIDEO_URL
```
Automatically detects content compatibility and streams or redirects as needed.

## 🔧 **Debugging Workflow**

### **1. Identify the Error Type**
```json
{
  "error": "Fallback extraction failed",
  "details": "Unable to extract content using fallback methods",
  "suggestions": [
    "The content may be protected by Cloudflare",
    "Try accessing the URL manually in a browser",
    "The content may have been removed",
    "Try a different provider or URL"
  ]
}
```

### **2. Test URL Accessibility**
```bash
# Test basic accessibility
curl -I "YOUR_VIDEO_URL"

# Expected successful response:
# HTTP/2 200
# content-type: video/mp4
# content-length: 12345678
# accept-ranges: bytes
```

### **3. Test with Debug Endpoints**
```bash
# Test stream-fallback analysis
curl "https://your-app.vercel.app/api/stream-fallback/test?url=YOUR_VIDEO_URL"

# Test transcode route
curl "https://your-app.vercel.app/api/transcode?url=YOUR_VIDEO_URL"
```

### **4. Analyze the Response**
Look for these key indicators:

**✅ Good Response:**
```json
{
  "success": true,
  "method": "direct-streaming",
  "contentType": "video/mp4",
  "contentLength": "12345678"
}
```

**❌ Problem Response:**
```json
{
  "error": "Streaming failed",
  "message": "HTTP 403: Forbidden",
  "suggestions": ["The URL may be protected by Cloudflare"]
}
```

## 🛠 **Troubleshooting Tools**

### **1. Browser Developer Tools**
- **Network Tab**: Check if the video URL is accessible
- **Console**: Look for CORS or fetch errors
- **Headers**: Verify content-type and other headers

### **2. Vercel Function Logs**
Look for these log messages:
- `[STREAM-FALLBACK] Processing URL: ...`
- `[STREAM-FALLBACK] Content-Type: ...`
- `[STREAM-FALLBACK] Streaming video content directly`
- `[STREAM-FALLBACK] Content doesn't appear to be video, attempting HTML parsing`

### **3. Test Endpoints**
Use these endpoints to debug:

**Environment Check:**
```
GET /api/transcode/test
```

**URL Analysis:**
```
GET /api/stream-fallback/test?url=YOUR_VIDEO_URL
```

**Smart Transcode:**
```
GET /api/transcode?url=YOUR_VIDEO_URL
```

**Direct Fallback:**
```
GET /api/stream-fallback?url=YOUR_VIDEO_URL
```

## 🎯 **Common Solutions**

### **Solution 1: Use Transcode Route First**
The transcode route automatically:
- Detects content compatibility
- Streams directly if possible
- Redirects to fallback if needed

```bash
# Try this first
GET /api/transcode?url=YOUR_VIDEO_URL
```

### **Solution 2: Check Content Type**
If the URL returns HTML instead of video:
- The video may be embedded in a webpage
- Use the fallback route which extracts video URLs from HTML
- Look for direct video links on the page

### **Solution 3: Handle Protected Content**
For Cloudflare-protected content:
- Try accessing the URL manually in a browser first
- Check if cookies or authentication are needed
- Consider using a different video source

### **Solution 4: Verify Video Format**
Ensure the video format is supported:
- **Supported**: MP4, WebM, HLS, DASH
- **May need transcoding**: MKV, AVI, MOV, WMV
- **Not supported**: Some proprietary formats

## 📊 **Error Response Analysis**

### **HTTP Status Codes**

**200 OK**: Content found and streaming
**307 Redirect**: Redirecting to fallback route
**400 Bad Request**: Invalid URL or parameters
**401 Unauthorized**: Authentication required
**403 Forbidden**: Access denied (Cloudflare, region block)
**404 Not Found**: Content removed or URL invalid
**422 Unprocessable**: No video content found
**500 Internal Error**: Server error or fetch failed

### **Content Analysis**

**Video Content Detected:**
```json
{
  "isVideoContent": true,
  "contentType": "video/mp4",
  "streamingTest": "Success"
}
```

**HTML Content (needs parsing):**
```json
{
  "isVideoContent": false,
  "contentType": "text/html",
  "method": "html-extraction"
}
```

**Protected Content:**
```json
{
  "error": "Fetch test failed",
  "message": "HTTP 403: Forbidden",
  "suggestions": ["The URL may be protected by Cloudflare"]
}
```

## 🚀 **Quick Fix Checklist**

### **Before Testing:**
- [ ] URL is accessible in browser
- [ ] No authentication required
- [ ] Video format is supported
- [ ] No region restrictions

### **Testing Steps:**
- [ ] Test with `/api/transcode/test`
- [ ] Test with `/api/stream-fallback/test?url=YOUR_URL`
- [ ] Check Vercel function logs
- [ ] Verify content-type headers

### **Common Fixes:**
- [ ] Use transcode route first (handles most cases automatically)
- [ ] Check if URL needs cookies/authentication
- [ ] Try different video source if protected
- [ ] Verify video format compatibility

## 🔍 **Advanced Debugging**

### **1. Check Vercel Function Logs**
```bash
# In Vercel dashboard > Functions > Logs
# Look for [STREAM-FALLBACK] and [TRANSCODE] messages
```

### **2. Test with Different Headers**
```bash
# Test with different User-Agent
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "YOUR_URL"
```

### **3. Check CORS Issues**
```bash
# Test if CORS is blocking the request
curl -H "Origin: https://your-app.vercel.app" "YOUR_URL"
```

### **4. Verify Network Access**
```bash
# Test if Vercel can reach the video source
# Check for network timeouts or connection errors
```

## 📞 **Getting Help**

If you're still experiencing issues:

1. **Check the logs**: Use the test endpoints to get detailed error information
2. **Test manually**: Try accessing the video URL directly in a browser
3. **Check format**: Ensure the video format is supported
4. **Verify access**: Make sure the video source is publicly accessible
5. **Contact support**: Provide the error details and test endpoint results

## 🎉 **Success Indicators**

Your video streaming is working correctly when you see:

- ✅ **Direct streaming**: Content streams immediately without errors
- ✅ **Smart detection**: Transcode route automatically handles compatibility
- ✅ **Fallback success**: Alternative methods find and stream content
- ✅ **Proper headers**: Content-Type, Content-Length, Accept-Ranges present
- ✅ **No timeouts**: Content streams within Vercel function limits

---

**Remember**: The transcode route now automatically handles most cases. If you're still getting errors, use the test endpoints to get detailed debugging information! 🚀
