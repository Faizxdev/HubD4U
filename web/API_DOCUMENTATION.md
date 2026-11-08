# Hub D4U API Documentation

**Base URL:** `https://hub-d4-u.vercel.app`

This document provides complete API documentation for building mobile applications using the Hub D4U backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Health Check](#1-health-check)
   - [Get Providers](#2-get-providers)
   - [Get Home Content](#3-get-home-content)
   - [Get Posts by Filter](#4-get-posts-by-filter)
   - [Search Content](#5-search-content)
   - [Get Content Info/Details](#6-get-content-infodetails)
   - [Get Episodes](#7-get-episodes)
   - [Get Stream Links](#8-get-stream-links)
   - [Proxy Video](#9-proxy-video)
   - [Transcode/Stream Video](#10-transcodestream-video)
   - [Stream Fallback](#11-stream-fallback)
   - [OMDB Metadata](#12-omdb-metadata)
   - [Subtitle Proxy](#13-subtitle-proxy)
   - [Trailers](#14-trailers)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Usage Flow](#usage-flow)
7. [Mobile App Integration Tips](#mobile-app-integration-tips)

---

## Overview

Hub D4U is a content aggregation API that fetches content from multiple providers. The API supports:

- Multiple content providers (movies, TV shows, anime, etc.)
- Search functionality
- Streaming with proxy support for CORS
- Episode listing for series content

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

---

## API Endpoints

### 1. Health Check

Check if the API is running and get system information.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-31T10:00:00.000Z",
  "environment": {
    "NODE_ENV": "production",
    "VERCEL": true,
    "VERCEL_REGION": "iad1"
  },
  "capabilities": {
    "fetch": "working",
    "streaming": "supported",
    "transcoding": "not-available (Vercel serverless)",
    "ffmpeg": "not-supported (use direct streaming instead)"
  },
  "platform": "linux",
  "arch": "x64",
  "nodeVersion": "v20.x.x",
  "routes": {
    "proxy": "/api/proxy - Direct video proxy with CORS",
    "transcode": "/api/transcode - Direct streaming (no FFmpeg)",
    "streamFallback": "/api/stream-fallback - Fallback streaming with multiple attempts",
    "stream": "/api/stream - Stream extraction from providers"
  }
}
```

---

### 2. Get Providers

Fetch the list of available content providers.

**Endpoint:** `GET /api/providers`

**Response:**
```json
{
  "providers": [
    {
      "value": "provider-id",
      "name": "Provider Display Name",
      "type": "global",
      "icon": "https://example.com/icon.png",
      "version": "1.0"
    }
  ]
}
```

**Provider Object:**
| Field | Type | Description |
|-------|------|-------------|
| `value` | string | Unique provider identifier (use this in other API calls) |
| `name` | string | Human-readable provider name |
| `type` | string | Provider type (e.g., "global", "anime", "movie") |
| `icon` | string | URL to provider icon |
| `version` | string | Provider version |

---

### 3. Get Home Content

Fetch home page content with catalog sections.

**Endpoint:** `GET /api/home`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `provider` | Yes | string | Provider value from `/api/providers` |
| `page` | No | number | Page number (default: 1) |

**Example:** `GET /api/home?provider=vegamovies&page=1`

**Response:**
```json
{
  "catalog": [
    {
      "title": "Latest Movies",
      "filter": "latest-movies"
    },
    {
      "title": "Trending",
      "filter": "trending"
    }
  ],
  "data": [
    {
      "title": "Latest Movies",
      "filter": "latest-movies",
      "Posts": [
        {
          "title": "Movie Title",
          "link": "/movie/movie-slug",
          "image": "https://example.com/poster.jpg"
        }
      ]
    }
  ]
}
```

---

### 4. Get Posts by Filter (View All)

Fetch all posts for a specific catalog filter with pagination. This is the "View All" endpoint used to browse complete category listings.

**Endpoint:** `GET /api/posts`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `provider` | Yes | string | Provider value |
| `filter` | Yes | string | Filter value from catalog (obtained from `/api/home` response) |
| `page` | No | number | Page number for pagination (default: 1) |

**Example:** `GET /api/posts?provider=vegamovies&filter=latest-movies&page=1`

**Response:**
```json
{
  "data": [
    {
      "title": "Movie Title",
      "link": "/movie/movie-slug",
      "image": "https://example.com/poster.jpg",
      "rating": "8.5",
      "year": "2024",
      "quality": "1080p"
    }
  ]
}
```

**Post Object:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Content title |
| `link` | string | Relative or absolute URL to content |
| `image` | string | Poster/thumbnail URL |
| `rating` | string? | Rating score (optional) |
| `year` | string? | Release year (optional) |
| `quality` | string? | Video quality like "1080p", "720p" (optional) |

**Infinite Scroll Implementation:**

```dart
// Flutter Example - Infinite Scroll
class ViewAllScreen extends StatefulWidget {
  final String provider;
  final String filter;
  final String title;
  
  // ...
}

class _ViewAllScreenState extends State<ViewAllScreen> {
  List<Post> items = [];
  int currentPage = 1;
  bool isLoading = false;
  bool hasMore = true;
  ScrollController scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    loadMore();
    scrollController.addListener(() {
      if (scrollController.position.pixels >= 
          scrollController.position.maxScrollExtent - 200) {
        loadMore();
      }
    });
  }

  Future<void> loadMore() async {
    if (isLoading || !hasMore) return;
    
    setState(() => isLoading = true);
    
    final response = await http.get(Uri.parse(
      'https://hub-d4-u.vercel.app/api/posts?provider=${widget.provider}&filter=${widget.filter}&page=$currentPage'
    ));
    
    final data = jsonDecode(response.body)['data'] as List;
    
    if (data.isEmpty) {
      setState(() => hasMore = false);
    } else {
      setState(() {
        items.addAll(data.map((e) => Post.fromJson(e)));
        currentPage++;
      });
    }
    
    setState(() => isLoading = false);
  }
}
```

```kotlin
// Kotlin/Android Example - Paging
class ViewAllViewModel(
    private val provider: String,
    private val filter: String
) : ViewModel() {
    
    private var currentPage = 1
    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts
    
    fun loadNextPage() {
        viewModelScope.launch {
            val url = "https://hub-d4-u.vercel.app/api/posts?provider=$provider&filter=$filter&page=$currentPage"
            val response = apiService.getPosts(url)
            
            if (response.data.isNotEmpty()) {
                _posts.value = _posts.value + response.data
                currentPage++
            }
        }
    }
}
```

**Usage Notes:**
- Use the `filter` value from the `/api/home` catalog response
- Increment `page` parameter for infinite scroll/pagination
- Empty `data` array indicates end of content
- Deduplicate items by `link` to avoid showing duplicates

---

### 5. Search Content

Search for content across a provider.

**Endpoint:** `GET /api/search`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `provider` | Yes | string | Provider value |
| `q` | Yes | string | Search query |
| `page` | No | number | Page number (default: 1) |

**Example:** `GET /api/search?provider=vegamovies&q=avengers&page=1`

**Response:**
```json
{
  "data": [
    {
      "title": "Avengers: Endgame",
      "link": "/movie/avengers-endgame",
      "image": "https://example.com/poster.jpg"
    }
  ]
}
```

---

### 6. Get Content Info/Details

Fetch detailed information about a specific content item. For series, includes quality options with episode links.

**Endpoint:** `GET /api/info`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `provider` | Yes | string | Provider value |
| `link` | Yes | string | Content link from posts |

**Example:** `GET /api/info?provider=flixhq&link=tv/watch-breaking-bad-39506`

**Response (Movie):**
```json
{
  "data": {
    "title": "Avengers: Endgame",
    "image": "https://example.com/poster.jpg",
    "synopsis": "Movie description...",
    "type": "movie",
    "rating": 8.4,
    "tags": ["Action", "Adventure"],
    "imdbId": "tt4154796",
    "linkList": [
      {
        "title": "1080p",
        "link": "https://example.com/stream-link"
      }
    ]
  }
}
```

**Response (Series - FlixHQ style with directLinks):**
```json
{
  "data": {
    "title": "Breaking Bad",
    "image": "https://example.com/poster.jpg",
    "synopsis": "Series description...",
    "type": "series",
    "rating": 9.5,
    "tags": ["TV Series", "45 min", "2008"],
    "cast": ["Bryan Cranston", "Aaron Paul"],
    "totalEpisodes": 62,
    "totalSeasons": 5,
    "seasons": [
      {
        "season": 1,
        "episodes": [
          {
            "episode": 1,
            "title": "Season-1 Ep-1",
            "link": "7013*tv/watch-breaking-bad-39506"
          }
        ]
      }
    ],
    "linkList": [
      {
        "title": "Breaking Bad",
        "directLinks": [
          {"title": "Season-1 Ep-1", "link": "7013*tv/watch-breaking-bad-39506"},
          {"title": "Season-1 Ep-2", "link": "7014*tv/watch-breaking-bad-39506"}
        ]
      }
    ]
  }
}
```

**Response (Series - Vega style with episodesLink):**
```json
{
  "data": {
    "title": "Stranger Things – Vol. 1",
    "synopsis": "Series description...",
    "type": "series",
    "imdbId": "tt4574334",
    "linkList": [
      {
        "title": "Season 4 – Vol. 1 [Hindi + English] WEB-DL 480p",
        "quality": "480p",
        "episodesLink": "https://nexdrive.pro/genxfm784776206295/",
        "link": "https://nexdrive.pro/genxfm784776206295/",
        "directLinks": []
      },
      {
        "title": "Season 4 – Vol. 1 [Hindi + English] WEB-DL 720p",
        "quality": "720p",
        "episodesLink": "https://nexdrive.pro/genxfm784776206356/",
        "link": "https://nexdrive.pro/genxfm784776206356/",
        "directLinks": []
      },
      {
        "title": "Season 4 – Vol. 1 [Hindi + English] WEB-DL 1080p",
        "quality": "1080p",
        "episodesLink": "https://nexdrive.pro/genxfm784776206238/",
        "link": "https://nexdrive.pro/genxfm784776206238/",
        "directLinks": []
      }
    ]
  }
}
```

**Note for Vega-style providers:** When `directLinks` is empty and `episodesLink` is present, use the `episodesLink` URL with `/api/episodes` to fetch the actual episode download links.

---

### 7. Get Episodes

Fetch episode list for series/TV shows with season grouping. Supports both provider-based fetching and direct external URL fetching.

**Endpoint:** `GET /api/episodes`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `provider` | Conditional | string | Provider value (required unless URL is external episodesLink) |
| `url` or `link` | Yes | string | Series URL or episodesLink URL |

**Example 1 - Provider-based (FlixHQ style):**
```
GET /api/episodes?provider=flixhq&url=tv/watch-breaking-bad-39506
```

**Example 2 - External episodesLink (Vega style):**
```
GET /api/episodes?url=https://nexdrive.pro/genxfm784776206295/
```
(provider is optional for external URLs like nexdrive.pro)

**Response:**
```json
{
  "data": [
    {
      "title": "Episode 1",
      "link": "https://vcloud.zip/v8gfs1a7z-ivcxv"
    },
    {
      "title": "Episode 2",
      "link": "https://vcloud.zip/ym1sldzrchhu4sq"
    },
    {
      "title": "Episode 3",
      "link": "https://vcloud.zip/rkkrmc_089r_h9i"
    }
  ],
  "seasons": [
    {
      "season": 1,
      "episodes": [
        {
          "episode": 1,
          "title": "Episode 1",
          "link": "https://vcloud.zip/v8gfs1a7z-ivcxv"
        },
        {
          "episode": 2,
          "title": "Episode 2",
          "link": "https://vcloud.zip/ym1sldzrchhu4sq"
        }
      ]
    }
  ],
  "totalEpisodes": 7,
  "totalSeasons": 1
}
```

**Features:**
- Returns both flat `data` array (backward compatible) and structured `seasons` array
- Automatically parses episode titles to extract season/episode numbers
- Supports external episodesLink URLs (nexdrive.pro, hubdrive, etc.) - fetches and parses HTML to extract episode download links
- Falls back to multiple methods: dedicated episodes module → stream module → meta module

---

### 8. Get Stream Links

Extract streaming links for a content item.

**Endpoint:** `GET /api/stream`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `provider` | Yes | string | Provider value |
| `link` | Yes | string | Stream link from info/episodes |
| `type` | No | string | Content type: "movie" or "series" (default: "movie") |
| `refresh` | No | string | Set to "true" to bypass cache |

**Example:** `GET /api/stream?provider=vegamovies&link=https://example.com/stream&type=movie`

**Response:**
```json
{
  "data": [
    {
      "server": "Server 1",
      "link": "https://example.com/video.mp4",
      "type": "mp4"
    },
    {
      "server": "Server 2",
      "link": "https://example.com/video.m3u8",
      "type": "m3u8"
    }
  ]
}
```

**Stream Object:**
| Field | Type | Description |
|-------|------|-------------|
| `server` | string | Server/source name |
| `link` | string | Direct video URL |
| `type` | string | Video type: "mp4", "m3u8", "mkv", "iframe" |

---

### 9. Proxy Video

Proxy video streams to handle CORS and add proper headers.

**Endpoint:** `GET /api/proxy`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `url` | Yes | string | Video URL to proxy |
| `referer` | No | string | Referer header for the request |

**Example:** `GET /api/proxy?url=https://example.com/video.mp4&referer=https://example.com`

**Response:** Binary video stream with proper CORS headers.

**Headers Returned:**
- `Access-Control-Allow-Origin: *`
- `Accept-Ranges: bytes`
- `Content-Type: video/mp4` (or appropriate type)
- `Content-Length: <size>`

**Use Case:** Use this endpoint when playing videos in mobile apps to bypass CORS restrictions.

---

### 10. Transcode/Stream Video

Direct video streaming with automatic fallback.

**Endpoint:** `GET /api/transcode`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `url` | Yes | string | Video URL to stream |
| `referer` | No | string | Referer header |

**Example:** `GET /api/transcode?url=https://example.com/video.mp4`

**Response:** Binary video stream or redirect to fallback.

**Features:**
- Supports range requests for seeking
- Automatic redirect to `/api/stream-fallback` on failure
- CORS headers included

---

### 11. Stream Fallback

Fallback streaming with multiple retry attempts and URL extraction.

**Endpoint:** `GET /api/stream-fallback`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `url` or `link` | Yes | string | Video URL |
| `referer` | No | string | Referer header |

**Example:** `GET /api/stream-fallback?url=https://example.com/video.mp4`

**Response:** Binary video stream or JSON with extracted URLs.

**Features:**
- Multiple user-agent rotation
- Automatic video URL extraction from HTML pages
- Returns extracted URLs if direct streaming fails

---

### 12. OMDB Metadata

Fetch additional metadata (ratings, cast, plot, awards) from OMDB API to enhance content info pages.

**Endpoint:** `GET /api/omdb`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `title` | Conditional | string | Movie/series title (required if no imdbId) |
| `imdbId` | Conditional | string | IMDB ID like tt1234567 (most accurate) |
| `year` | No | string | Release year for better matching |
| `type` | No | string | Content type: "movie" or "series" |

**Example:** `GET /api/omdb?title=Inception&year=2010`

**Example with IMDB ID:** `GET /api/omdb?imdbId=tt1375666`

**Response:**
```json
{
  "data": {
    "title": "Inception",
    "year": "2010",
    "rated": "PG-13",
    "released": "16 Jul 2010",
    "runtime": "148 min",
    "genre": ["Action", "Adventure", "Sci-Fi"],
    "director": ["Christopher Nolan"],
    "writer": ["Christopher Nolan"],
    "actors": ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
    "plot": "A thief who steals corporate secrets through the use of dream-sharing technology...",
    "language": "English, Japanese, French",
    "country": "United States, United Kingdom",
    "awards": "Won 4 Oscars. 159 wins & 220 nominations total",
    "poster": "https://m.media-amazon.com/images/M/...",
    "ratings": [
      { "source": "Internet Movie Database", "value": "8.8/10" },
      { "source": "Rotten Tomatoes", "value": "87%" },
      { "source": "Metacritic", "value": "74/100" }
    ],
    "metascore": "74",
    "imdbRating": "8.8",
    "imdbVotes": "2,400,000",
    "imdbId": "tt1375666",
    "type": "movie",
    "boxOffice": "$292,576,195",
    "totalSeasons": null
  }
}
```

**OMDB Data Object:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Official title |
| `year` | string | Release year |
| `rated` | string | Content rating (PG-13, R, etc.) |
| `released` | string | Release date |
| `runtime` | string | Duration (e.g., "148 min") |
| `genre` | string[] | Array of genres |
| `director` | string[] | Array of directors |
| `writer` | string[] | Array of writers |
| `actors` | string[] | Array of main actors |
| `plot` | string | Full plot description |
| `language` | string | Languages |
| `country` | string | Production countries |
| `awards` | string | Awards and nominations |
| `poster` | string | High-quality poster URL |
| `ratings` | array | Ratings from multiple sources |
| `metascore` | string | Metacritic score |
| `imdbRating` | string | IMDB rating (e.g., "8.8") |
| `imdbVotes` | string | Number of IMDB votes |
| `imdbId` | string | IMDB ID |
| `type` | string | "movie" or "series" |
| `boxOffice` | string | Box office earnings (movies only) |
| `totalSeasons` | string | Number of seasons (series only) |

**Usage in Mobile App:**
```dart
// Fetch OMDB data after getting content info
Future<OMDBData?> fetchOMDBData(String title, String? imdbId, String? year) async {
  String url = 'https://hub-d4-u.vercel.app/api/omdb?';
  
  if (imdbId != null) {
    url += 'imdbId=$imdbId';
  } else {
    url += 'title=${Uri.encodeComponent(title)}';
    if (year != null) url += '&year=$year';
  }
  
  final response = await http.get(Uri.parse(url));
  final json = jsonDecode(response.body);
  
  if (json['data'] != null) {
    return OMDBData.fromJson(json['data']);
  }
  return null;
}
```

---

### 13. Subtitle Proxy

Fetch and convert subtitles from SRT to WebVTT format for HTML5 video compatibility.

**Endpoint:** `GET /api/subtitle`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `url` | Yes | string | Subtitle URL (SRT or VTT format) |

**Example:** `GET /api/subtitle?url=https://dl.opensubtitles.org/en/download/sub/12345`

**Response:** WebVTT formatted subtitle text.

**Response Headers:**
```
Content-Type: text/vtt; charset=utf-8
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=86400
```

**Features:**
- Automatically converts SRT format to WebVTT
- Proper timing format conversion (comma to dot for milliseconds)
- CORS headers for browser compatibility
- 24-hour caching

---

### 14. Trailers

Fetch movie/TV show trailers from TMDB (The Movie Database) API. Returns YouTube video links.

**Endpoint:** `GET /api/trailer`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `imdbId` | Conditional | string | IMDB ID (most accurate, e.g., tt1375666) |
| `title` | Conditional | string | Movie/series title (required if no imdbId) |
| `year` | No | string | Release year for better matching |
| `type` | No | string | Content type: "movie" or "tv" (default: "movie") |

**Example with IMDB ID:** `GET /api/trailer?imdbId=tt1375666`

**Example with title:** `GET /api/trailer?title=Inception&year=2010&type=movie`

**Response:**
```json
{
  "data": {
    "tmdbId": 27205,
    "trailers": [
      {
        "id": "533ec654c3a36854480003eb",
        "key": "YoHD9XEInc0",
        "name": "Inception - Official Trailer",
        "site": "YouTube",
        "type": "Trailer",
        "url": "https://www.youtube.com/watch?v=YoHD9XEInc0",
        "thumbnail": "https://img.youtube.com/vi/YoHD9XEInc0/maxresdefault.jpg"
      },
      {
        "id": "533ec654c3a36854480003ec",
        "key": "66TuSJo4dZM",
        "name": "Inception - Teaser",
        "site": "YouTube",
        "type": "Teaser",
        "url": "https://www.youtube.com/watch?v=66TuSJo4dZM",
        "thumbnail": "https://img.youtube.com/vi/66TuSJo4dZM/maxresdefault.jpg"
      }
    ],
    "mainTrailer": {
      "id": "533ec654c3a36854480003eb",
      "key": "YoHD9XEInc0",
      "name": "Inception - Official Trailer",
      "site": "YouTube",
      "type": "Trailer",
      "url": "https://www.youtube.com/watch?v=YoHD9XEInc0",
      "thumbnail": "https://img.youtube.com/vi/YoHD9XEInc0/maxresdefault.jpg"
    }
  }
}
```

**Trailer Object:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique video ID |
| `key` | string | YouTube video ID |
| `name` | string | Video title |
| `site` | string | Video platform (always "YouTube") |
| `type` | string | Video type: "Trailer", "Teaser", "Clip", etc. |
| `url` | string | Full YouTube URL |
| `thumbnail` | string | YouTube thumbnail URL (maxresdefault) |

**Features:**
- Searches by IMDB ID (most accurate) or title
- Returns multiple trailers sorted by priority (Official Trailer > Trailer > Teaser)
- Provides `mainTrailer` for quick access to the best trailer
- YouTube embed-ready video keys

**Usage in Mobile App:**
```dart
// Fetch trailers
Future<List<Trailer>> fetchTrailers(String? imdbId, String title) async {
  String url = 'https://hub-d4-u.vercel.app/api/trailer?';
  
  if (imdbId != null) {
    url += 'imdbId=$imdbId';
  } else {
    url += 'title=${Uri.encodeComponent(title)}';
  }
  
  final response = await http.get(Uri.parse(url));
  final json = jsonDecode(response.body);
  
  if (json['data']?['trailers'] != null) {
    return (json['data']['trailers'] as List)
        .map((t) => Trailer.fromJson(t))
        .toList();
  }
  return [];
}

// Play trailer in YouTube player or WebView
void playTrailer(Trailer trailer) {
  // Option 1: Open YouTube app/browser
  launchUrl(Uri.parse(trailer.url));
  
  // Option 2: Embed in WebView
  final embedUrl = 'https://www.youtube.com/embed/${trailer.key}?autoplay=1';
  // Use in WebView widget
}
```

---

## Data Models

### Post Object
```typescript
interface Post {
  title: string;      // Content title
  link: string;       // Relative or absolute URL
  image: string;      // Poster/thumbnail URL
}
```

### Content Info Object
```typescript
interface ContentInfo {
  title: string;
  image: string;
  synopsis?: string;
  type: "movie" | "series" | "tv" | "anime";
  rating?: number;
  tags?: string[];
  cast?: string[];
  imdbId?: string;
  
  // For movies - simple link list
  linkList?: LinkListItem[];
  
  // For series (auto-structured when directLinks are populated)
  totalEpisodes?: number;
  totalSeasons?: number;
  seasons?: Season[];
}

// LinkList item structure varies by provider
interface LinkListItem {
  title: string;           // Quality/version title
  quality?: string;        // "480p", "720p", "1080p"
  
  // FlixHQ-style: episodes in directLinks
  directLinks?: Array<{
    title: string;         // "Season-1 Ep-1"
    link: string;          // Episode stream link
  }>;
  
  // Vega-style: external URL to fetch episodes
  episodesLink?: string;   // "https://nexdrive.pro/..."
  link?: string;           // Same as episodesLink for convenience
}
```

### Episode Object
```typescript
interface Episode {
  title: string;      // Episode title (e.g., "Season-1 Ep-1" or "Episode 1")
  link: string;       // Episode stream link or download link
}

interface StructuredEpisode {
  episode: number;    // Episode number
  title: string;      // Episode title
  link: string;       // Episode stream link
}

interface Season {
  season: number;     // Season number
  episodes: StructuredEpisode[];
}
```

### Stream Object
```typescript
interface Stream {
  server: string;     // Server name
  link: string;       // Video URL
  type: string;       // "mp4", "m3u8", "mkv", "iframe"
}
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message",
  "details": "Additional details (development only)",
  "status": 400
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Missing required parameters |
| 408 | Request Timeout |
| 422 | Unprocessable Entity - Content extraction failed |
| 500 | Internal Server Error |
| 502 | Bad Gateway - Upstream server error |

---

## Usage Flow

### For Movies:
```
1. GET /api/providers          → Get list of providers
2. GET /api/home               → Get home content with catalog
3. GET /api/search             → Search for specific content
4. GET /api/info               → Get movie details + linkList
5. GET /api/stream             → Get streaming links from linkList item
6. GET /api/proxy?url=<link>   → Play video through proxy
```

### For TV Series (FlixHQ-style - directLinks populated):
```
1. GET /api/providers          → Get list of providers
2. GET /api/home               → Get home content
3. GET /api/search             → Search for series
4. GET /api/info               → Get series details
   └── Response includes: linkList[].directLinks[] with episode links
   └── Also includes: seasons[] (auto-structured)
5. GET /api/stream             → Get streaming links for specific episode
6. GET /api/proxy?url=<link>   → Play video through proxy
```

### For TV Series (Vega-style - episodesLink pattern):
```
1. GET /api/providers          → Get list of providers
2. GET /api/search             → Search for series
3. GET /api/info               → Get series details
   └── Response includes: linkList[] with quality options
   └── Each item has: episodesLink (URL to fetch episodes)
4. User selects quality option
5. GET /api/episodes?url=<episodesLink>  → Fetch episodes from external URL
   └── Returns: episode download links (vcloud.zip, etc.)
6. GET /api/stream             → Get streaming links for episode
7. GET /api/proxy?url=<link>   → Play video through proxy
```

### For View All (Browse Category):
```
1. GET /api/home               → Get catalog with filter values
2. GET /api/posts?filter=X&page=1  → Get first page of category
3. GET /api/posts?filter=X&page=2  → Get second page (infinite scroll)
4. GET /api/posts?filter=X&page=N  → Continue loading pages until empty
5. GET /api/info               → Get details when user selects item
6. GET /api/stream             → Get streaming links
7. GET /api/proxy?url=<link>   → Play video through proxy
```

---

## Mobile App Integration Tips

### 1. Video Playback

Always use the proxy endpoint for video playback to avoid CORS issues:

```dart
// Flutter/Dart Example
final proxyUrl = 'https://hub-d4-u.vercel.app/api/proxy?url=${Uri.encodeComponent(videoUrl)}';
```

```kotlin
// Kotlin/Android Example
val proxyUrl = "https://hub-d4-u.vercel.app/api/proxy?url=${URLEncoder.encode(videoUrl, "UTF-8")}"
```

```swift
// Swift/iOS Example
let proxyUrl = "https://hub-d4-u.vercel.app/api/proxy?url=\(videoUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"
```

### 2. Handling M3U8 Streams

For HLS (.m3u8) streams, use a native video player that supports HLS:

- **Android:** ExoPlayer
- **iOS:** AVPlayer (native support)
- **Flutter:** video_player or better_player package
- **React Native:** react-native-video

### 3. Caching Recommendations

- Cache provider list for 24 hours
- Cache home content for 1 hour
- Cache search results for 30 minutes
- Cache content info for 1 hour
- Don't cache stream links (they may expire)

### 4. Error Handling

```dart
// Flutter Example
try {
  final response = await http.get(Uri.parse(apiUrl));
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    if (data['error'] != null) {
      // Handle API error
      throw Exception(data['error']);
    }
    return data;
  } else {
    throw Exception('HTTP ${response.statusCode}');
  }
} catch (e) {
  // Handle network error
  print('Error: $e');
}
```

### 5. Pagination

Most list endpoints support pagination:

```dart
int currentPage = 1;

Future<void> loadMore() async {
  currentPage++;
  final response = await http.get(
    Uri.parse('https://hub-d4-u.vercel.app/api/posts?provider=$provider&filter=$filter&page=$currentPage')
  );
  // Append results to existing list
}
```

### 6. Provider Selection

Store the selected provider in local storage and allow users to switch:

```dart
// Save selected provider
await prefs.setString('selectedProvider', provider.value);

// Load selected provider
final savedProvider = prefs.getString('selectedProvider');
```

---

## Complete Example: Fetching and Playing a Movie

```dart
// 1. Get providers
final providersResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/providers')
);
final providers = jsonDecode(providersResponse.body)['providers'];
final selectedProvider = providers[0]['value'];

// 2. Search for a movie
final searchResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/search?provider=$selectedProvider&q=avengers')
);
final searchResults = jsonDecode(searchResponse.body)['data'];
final movie = searchResults[0];

// 3. Get movie details
final infoResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/info?provider=$selectedProvider&link=${movie['link']}')
);
final movieInfo = jsonDecode(infoResponse.body)['data'];

// 4. Get stream links
final streamLink = movieInfo['linkList'][0]['link'];
final streamResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/stream?provider=$selectedProvider&link=$streamLink&type=movie')
);
final streams = jsonDecode(streamResponse.body)['data'];

// 5. Play video through proxy
final videoUrl = streams[0]['link'];
final proxyUrl = 'https://hub-d4-u.vercel.app/api/proxy?url=${Uri.encodeComponent(videoUrl)}';

// Use proxyUrl in your video player
```

---

## Complete Example: Fetching and Playing a Series (Vega-style)

```dart
// 1. Search for a series on Vega provider
final searchResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/search?provider=vega&q=stranger+things')
);
final searchResults = jsonDecode(searchResponse.body)['data'];
final series = searchResults[0];

// 2. Get series details
final infoResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/info?provider=vega&link=${Uri.encodeComponent(series['link'])}')
);
final seriesInfo = jsonDecode(infoResponse.body)['data'];

// 3. Display quality options to user
// seriesInfo['linkList'] contains quality options like:
// - "Season 4 – Vol. 1 [Hindi + English] WEB-DL 480p"
// - "Season 4 – Vol. 1 [Hindi + English] WEB-DL 720p"
// - "Season 4 – Vol. 1 [Hindi + English] WEB-DL 1080p"
final qualityOptions = seriesInfo['linkList'];
print('Available qualities:');
for (var option in qualityOptions) {
  print('- ${option['title']} (${option['quality']})');
}

// 4. User selects a quality - get the episodesLink
final selectedQuality = qualityOptions[0]; // e.g., 480p
final episodesLink = selectedQuality['episodesLink'];
// episodesLink = "https://nexdrive.pro/genxfm784776206295/"

// 5. Fetch episodes from the episodesLink
final episodesResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/episodes?url=${Uri.encodeComponent(episodesLink)}')
);
final episodesData = jsonDecode(episodesResponse.body);

// episodesData contains:
// {
//   "data": [
//     {"title": "Episode 1", "link": "https://vcloud.zip/v8gfs1a7z-ivcxv"},
//     {"title": "Episode 2", "link": "https://vcloud.zip/ym1sldzrchhu4sq"},
//     ...
//   ],
//   "seasons": [...],
//   "totalEpisodes": 7
// }

// 6. Display episodes to user
print('Episodes:');
for (var ep in episodesData['data']) {
  print('- ${ep['title']}: ${ep['link']}');
}

// 7. User selects an episode - get stream link
final selectedEpisode = episodesData['data'][0];
final episodeLink = selectedEpisode['link'];
// episodeLink = "https://vcloud.zip/v8gfs1a7z-ivcxv"

// 8. Get stream from the episode link
final streamResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/stream?provider=vega&link=${Uri.encodeComponent(episodeLink)}&type=series')
);
final streams = jsonDecode(streamResponse.body)['data'];

// 9. Play video through proxy
final videoUrl = streams[0]['link'];
final proxyUrl = 'https://hub-d4-u.vercel.app/api/proxy?url=${Uri.encodeComponent(videoUrl)}';

// Use proxyUrl in your video player
```

---

## Complete Example: Fetching and Playing a Series (FlixHQ-style)

```dart
// 1. Search for a series on FlixHQ provider
final searchResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/search?provider=flixhq&q=breaking+bad')
);
final searchResults = jsonDecode(searchResponse.body)['data'];
final series = searchResults.firstWhere((s) => s['link'].contains('tv/'));

// 2. Get series details - episodes are already included
final infoResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/info?provider=flixhq&link=${series['link']}')
);
final seriesInfo = jsonDecode(infoResponse.body)['data'];

// 3. Episodes are in seriesInfo['seasons'] (auto-structured)
// Or in seriesInfo['linkList'][0]['directLinks']
print('Seasons: ${seriesInfo['totalSeasons']}');
print('Total Episodes: ${seriesInfo['totalEpisodes']}');

for (var season in seriesInfo['seasons']) {
  print('Season ${season['season']}:');
  for (var ep in season['episodes']) {
    print('  - Episode ${ep['episode']}: ${ep['title']}');
  }
}

// 4. User selects an episode
final selectedEpisode = seriesInfo['seasons'][0]['episodes'][0];
final episodeLink = selectedEpisode['link'];
// episodeLink = "7013*tv/watch-breaking-bad-39506"

// 5. Get stream from the episode link
final streamResponse = await http.get(
  Uri.parse('https://hub-d4-u.vercel.app/api/stream?provider=flixhq&link=$episodeLink&type=series')
);
final streams = jsonDecode(streamResponse.body)['data'];

// 6. Play video through proxy
final videoUrl = streams[0]['link'];
final proxyUrl = 'https://hub-d4-u.vercel.app/api/proxy?url=${Uri.encodeComponent(videoUrl)}';

// Use proxyUrl in your video player
```

---

## Rate Limiting

Currently, there are no rate limits enforced. However, please be respectful and avoid excessive requests.

---

## Player Features

The web player includes several advanced features that can be integrated into mobile apps:

### Audio Track Selection

For HLS streams with multiple audio tracks (e.g., different languages), the player automatically detects and allows switching between them.

**HLS.js Events Used:**
- `AUDIO_TRACKS_UPDATED` - Fired when audio tracks are detected
- `hls.audioTracks` - Array of available audio tracks
- `hls.audioTrack = index` - Set the active audio track

**Audio Track Object:**
```typescript
interface AudioTrack {
  index: number;      // Track index
  label: string;      // Track name (e.g., "English", "Hindi")
  language: string;   // Language code (e.g., "en", "hi")
}
```

### Subtitle Track Selection

For HLS streams with embedded subtitles, the player detects and allows switching between them.

**HLS.js Events Used:**
- `SUBTITLE_TRACKS_UPDATED` - Fired when subtitle tracks are detected
- `hls.subtitleTracks` - Array of available subtitle tracks
- `hls.subtitleTrack = index` - Set the active subtitle track (-1 to disable)

### OpenSubtitles Search Integration

The player includes integration with OpenSubtitles.org for searching and loading external subtitles.

**OpenSubtitles API:**
```
GET https://rest.opensubtitles.org/search/{searchType}-{query}/sublanguageid-{lang}
Headers:
  X-User-Agent: VLSub 0.10.2
```

**Search Types:**
- `query-{movieName}` - Search by movie/show name
- `imdbid-{ttXXXXXXX}` - Search by IMDB ID (more accurate)

**Supported Languages:**
| Code | Language |
|------|----------|
| eng | English |
| spa | Spanish |
| fre | French |
| ger | German |
| ita | Italian |
| por | Portuguese |
| rus | Russian |
| ara | Arabic |
| hin | Hindi |
| jpn | Japanese |
| kor | Korean |
| chi | Chinese |
| tur | Turkish |
| pol | Polish |
| dut | Dutch |
| ind | Indonesian |
| vie | Vietnamese |

**Response Object:**
```typescript
interface SubtitleResult {
  IDSubtitleFile: string;
  SubLanguageID: string;      // "eng", "spa", etc.
  LanguageName: string;       // "English", "Spanish", etc.
  MovieName: string;          // Movie/show name
  SubFileName: string;        // Subtitle filename
  SubDownloadLink: string;    // Download URL (remove .gz extension)
  SubDownloadsCnt: string;    // Download count
  SeriesSeason?: string;      // Season number (for TV shows)
  SeriesEpisode?: string;     // Episode number (for TV shows)
  InfoReleaseGroup?: string;  // Release group info
  ISO639: string;             // Language ISO code
}
```

**Loading External Subtitles:**
```javascript
// Remove .gz extension from download link
const subUrl = subtitle.SubDownloadLink.replace('.gz', '');

// Use the subtitle API which converts SRT to VTT format
const proxiedUrl = `/api/subtitle?url=${encodeURIComponent(subUrl)}`;

// Remove existing tracks first
const existingTracks = video.querySelectorAll('track');
existingTracks.forEach(t => t.remove());

// Add track to video element (must have crossOrigin="anonymous")
const track = document.createElement('track');
track.kind = 'subtitles';
track.label = subtitle.LanguageName;
track.srclang = subtitle.ISO639;
track.src = proxiedUrl;
track.default = true;

// Add load event to enable track after it's ready (important for seek sync)
track.addEventListener('load', () => {
  if (video.textTracks.length > 0) {
    video.textTracks[0].mode = 'showing';
  }
});

video.appendChild(track);
```

**Important Notes for Subtitle Sync:**
- Always use `crossOrigin="anonymous"` on the video element
- Remove existing tracks before adding new ones
- Wait for the track `load` event before enabling it
- The subtitle API converts SRT to VTT format automatically (HTML5 video only supports VTT)

**Subtitle Styling (CSS):**
```css
video::cue {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 1.2em;
  font-family: Arial, sans-serif;
  padding: 0.2em 0.5em;
  border-radius: 4px;
}
```

### Subtitle Proxy API

**Endpoint:** `GET /api/subtitle`

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `url` | Yes | string | Subtitle URL (SRT or VTT format) |

**Features:**
- Automatically converts SRT format to WebVTT (required for HTML5 video)
- Proper parsing of SRT timing format (converts `00:00:00,000` to `00:00:00.000`)
- Handles CORS for external subtitle sources
- Caches subtitles for 24 hours
- Subtitles sync properly when seeking/skipping in video

**Example:**
```
GET /api/subtitle?url=https://dl.opensubtitles.org/en/download/sub/12345
```

**Response:** WebVTT formatted subtitle text with proper headers.

**Response Headers:**
```
Content-Type: text/vtt; charset=utf-8
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=86400
```

### Download Functionality

The player provides download options for video streams:

1. **Direct Download** - For MP4/MKV files, triggers browser download
2. **Copy Link** - Copies the direct video URL for use with external downloaders

**Proxy URL for Download:**
```
/api/proxy?url={videoUrl}&referer={referer}&download=true
```

The `download=true` parameter adds `Content-Disposition: attachment` header.

### Player URL Parameters

The web player (`/player`) accepts the following URL parameters:

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `link` | Yes | string | Stream URL or content link |
| `provider` | No | string | Provider value (auto-detected if not provided) |
| `type` | No | string | Content type: "movie" or "series" |
| `title` | No | string | Display title |
| `episodeList` | No | string | URL-encoded JSON array of episodes (for next episode feature) |
| `episodeIndex` | No | number | Current episode index in the list |
| `infoUrl` | No | string | URL to content info page |
| `poster` | No | string | Poster image URL |

**Example with Episode Navigation:**
```javascript
const params = new URLSearchParams({
  link: 'https://example.com/stream.m3u8',
  provider: 'vegamovies',
  type: 'series',
  title: 'Breaking Bad S01E01',
  episodeIndex: '0',
  episodeList: encodeURIComponent(JSON.stringify([
    { title: 'S01E01', link: 'https://...' },
    { title: 'S01E02', link: 'https://...' },
  ])),
  infoUrl: '/info?provider=vegamovies&link=...',
  poster: 'https://example.com/poster.jpg'
});

window.location.href = `/player?${params.toString()}`;
```

### Player Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space / K | Play/Pause |
| F | Toggle Fullscreen |
| M | Toggle Mute |
| P | Toggle Picture-in-Picture |
| R | Cycle Resize Mode |
| N | Next Episode (when available) |
| J / ← | Rewind 10 seconds |
| L / → | Forward 10 seconds |
| ↑ | Volume Up |
| ↓ | Volume Down |
| 0-9 | Seek to 0%-90% of video |
| Escape | Close settings panel |

---

## Support

For issues or questions, please check the repository or create an issue.

---

## Changelog

- **v1.7** - Advanced Player Features (Vega-inspired)
  - Added **Player Lock** - Prevents accidental touches/clicks during playback
    - Lock icon in top bar toggles lock state
    - When locked, tap screen to show unlock button
    - Visual lock indicator in corner when locked
  - Added **Resize Modes** - Video scaling options
    - Fit (contain) - Default, shows full video with letterboxing
    - Cover - Fills screen, may crop edges
    - Stretch (fill) - Stretches to fill, may distort
    - None - Original size
    - Cycle with button or press 'R' key
  - Added **Picture-in-Picture (PIP)** - Continue watching in floating window
    - Uses native browser PIP API
    - Toggle with button or press 'P' key
  - Added **Next Episode Button** - Auto-shows when >80% watched
    - Only appears for series with episode list
    - Press 'N' key to go to next episode
  - Added **Watch History** - Saves and resumes playback position
    - Progress saved to localStorage every 10 seconds
    - Auto-resumes from last position on reload
    - Maintains "Continue Watching" list (last 20 items)
  - Added **Toast Messages** - Visual feedback for actions
    - Shows when locking/unlocking, changing resize mode, etc.
    - Auto-dismisses after 2 seconds
  - New keyboard shortcuts: P (PIP), R (Resize), N (Next Episode)

- **v1.6** - Hero Banner Enhancement
  - Enhanced Hero slider with OMDB metadata integration
  - Added logo display support for featured content
  - Added genre tags display on hero banner
  - Added content type badge (movie/series)
  - Added runtime display from OMDB
  - Improved metadata loading with fallback to provider data
  - Auto-fetches enhanced metadata for featured content
  - Trailer API now uses CORS proxies for better reliability
  - Added YouTube search fallback when TMDB is unavailable

- **v1.5** - Trailer Support
  - Added `/api/trailer` endpoint for fetching trailers from TMDB API
  - Added "Watch Trailer" button on info page
  - Trailer modal with embedded YouTube player
  - Multiple trailers support with thumbnail grid
  - Auto-prioritizes official trailers over teasers
  - Direct YouTube link for external viewing

- **v1.4** - OMDB Integration
  - Added `/api/omdb` endpoint for fetching additional metadata from OMDB API
  - Enhanced info page with IMDB ratings, Metascore, and multiple rating sources
  - Added cast & crew information (director, actors, writers)
  - Added awards and box office data display
  - Added runtime, content rating (PG-13, R, etc.), and release date
  - Added total seasons count for TV series
  - Added direct IMDB link button
  - Info page now shows loading indicator while fetching OMDB data
  - Automatic title cleaning for better OMDB search results

- **v1.3** - Player Enhancements
  - Added audio track selection for HLS streams (multiple audio languages)
  - Added subtitle track selection for embedded subtitles
  - Added OpenSubtitles search integration for external subtitles
  - Added auto-subtitle loading (searches and loads best match automatically)
  - Added `/api/subtitle` endpoint for SRT to VTT conversion with proper timing sync
  - Added subtitle CSS styling for better visibility
  - Fixed subtitle sync when seeking/skipping in video
  - Added download functionality with direct download and copy link options
  - Improved stream extraction with parallel processing and caching
  - Fixed video element with `crossOrigin="anonymous"` for subtitle support
  
- **v1.2** - Enhanced series/episodes support
  - Added support for Vega-style providers with `episodesLink` pattern
  - `/api/episodes` now supports external URLs (nexdrive.pro, hubdrive, etc.)
  - Auto-parses HTML pages to extract episode download links
  - Provider parameter is optional for external episodesLink URLs
  
- **v1.1** - Improved episode handling
  - Added structured `seasons` array to `/api/info` and `/api/episodes` responses
  - Auto-parses episode titles to extract season/episode numbers
  - Multiple fallback methods for fetching episodes
  
- **v1.0** - Initial API release with all core endpoints
