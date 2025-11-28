import ytmusicapi
import pytube
import json
import logging
import time
import os
import tempfile
import diskcache as dc

# Configure logging to be accessible via Logcat
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Get appropriate cache directory for Android environment
def get_cache_directory():
    """Get appropriate cache directory for Android environment"""
    try:
        # Try to use app-specific cache directory
        cache_dir = os.path.join(tempfile.gettempdir(), 'orbit_cache')
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
        return cache_dir
    except Exception as e:
        logger.warning(f"Could not create cache directory: {e}")
        # Fallback to current directory
        return './cache'

# Global cache and session objects
_cache = None
_ytmusic_session = None
_CACHE_TTL = 24 * 60 * 60  # 24 hours default TTL

# Initialize cache with proper directory
def init_cache():
    """Initialize cache with proper directory"""
    global _cache
    try:
        cache_dir = get_cache_directory()
        _cache = dc.Cache(cache_dir, size_limit=500 * 1024 * 1024, eviction_policy='least-recently-used')
        logger.info(f"Cache initialized successfully at: {cache_dir}")
        return True
    except Exception as e:
        logger.error(f"Cache initialization failed: {e}")
        # Fallback: create a simple dict-based cache
        _cache = None
        return False

def _get_cache_key(key_type, **params):
    """Generate cache key for different operations"""
    return f"{key_type}:{json.dumps(params, sort_keys=True)}"

# Simple in-memory cache fallback
_memory_cache = {}
_cache_initialized = False

def _get_cached_result(key):
    """Get cached result if not expired"""
    try:
        # Try diskcache first
        if _cache is not None and _cache_initialized:
            if key in _cache:
                data, timestamp = _cache[key]
                if time.time() - timestamp < _CACHE_TTL:
                    return data
                else:
                    del _cache[key]  # Remove expired entry
        else:
            # Fallback to memory cache
            if key in _memory_cache:
                data, timestamp = _memory_cache[key]
                if time.time() - timestamp < _CACHE_TTL:
                    return data
                else:
                    del _memory_cache[key]  # Remove expired entry
    except Exception as e:
        logger.warning(f"Cache read error: {e}")
    return None

def _set_cached_result(key, data):
    """Cache result with timestamp"""
    try:
        # Try diskcache first
        if _cache is not None and _cache_initialized:
            _cache[key] = (data, time.time())
        else:
            # Fallback to memory cache
            _memory_cache[key] = (data, time.time())
    except Exception as e:
        logger.warning(f"Cache write error: {e}")

def get_ytmusic_session():
    """Get or create YTMusic session with session persistence"""
    global _ytmusic_session
    if _ytmusic_session is None:
        try:
            # Set environment variables to prevent database creation
            os.environ['YTMUSICAPI_NO_CACHE'] = '1'
            
            # Create a temporary directory for any required files
            temp_dir = tempfile.mkdtemp(prefix='ytmusic_')
            os.environ['HOME'] = temp_dir  # Override HOME to use temp directory
            
            # Try multiple initialization strategies for Android environment
            strategies = [
                # Strategy 1: No browser parameter, clean initialization (best for Android)
                lambda: ytmusicapi.YTMusic(language='en', location='IN'),
                # Strategy 2: Try with explicit None for auth (fallback)
                lambda: ytmusicapi.YTMusic(language='en', location='IN', auth=None)
            ]
            
            for i, strategy in enumerate(strategies):
                try:
                    _ytmusic_session = strategy()
                    logger.info(f"YTMusic session created successfully with strategy {i+1}")
                    logger.info(f"Using temp directory: {temp_dir}")
                    break
                except Exception as e:
                    logger.warning(f"Strategy {i+1} failed: {e}")
                    if i == len(strategies) - 1:
                        # Last strategy failed, raise the error
                        logger.error(f"All initialization strategies failed. Final error: {e}")
                        raise e
                    continue
            
        except Exception as e:
            logger.error(f"Failed to create YTMusic session: {e}")
            # If all else fails, create a mock session that returns empty data
            _ytmusic_session = MockYTMusic()
            logger.warning("Using mock YTMusic session as fallback")
    
    return _ytmusic_session

class MockYTMusic:
    """Mock YTMusic class for fallback when real initialization fails"""
    def __init__(self):
        pass
    
    def get_home(self, limit=10):
        logger.info("MockYTMusic: Returning empty home feed")
        return []
    
    def search(self, query, filter='songs', limit=10):
        logger.info(f"MockYTMusic: Returning empty search results for: {query}")
        return []
    
    def get_charts(self, country='IN'):
        logger.info(f"MockYTMusic: Returning empty charts for: {country}")
        return {"videos": [], "artists": [], "genres": []}

def get_home(limit=10):
    """Get home feed with caching"""
    cache_key = _get_cache_key("home", limit=limit)

    # Try cache first
    cached = _get_cached_result(cache_key)
    if cached:
        logger.info("Returning cached home feed")
        return json.dumps(cached)

    try:
        logger.info("Fetching fresh home feed")
        ytmusic = get_ytmusic_session()
        
        # Handle database/operational errors specifically
        try:
            data = ytmusic.get_home(limit=limit)
        except Exception as db_error:
            if "unable to open database file" in str(db_error).lower() or "operationalerror" in str(db_error).lower():
                logger.error(f"Database access error in get_home: {db_error}")
                # Return empty data structure to prevent app crash
                data = {"error": "database_error", "message": "Service temporarily unavailable", "data": []}
                return json.dumps(data)
            else:
                raise db_error

        # Validate data structure
        if data is None:
            logger.warning("Home feed returned None, returning empty data")
            data = []
        elif isinstance(data, dict) and "error" in data:
            # Don't cache error responses
            logger.error(f"API returned error in home feed: {data}")
            return json.dumps(data)
        elif not isinstance(data, list):
            logger.warning(f"Home feed returned unexpected type: {type(data)}, converting to list")
            data = []

        # Cache the result only if it's valid data
        _set_cached_result(cache_key, data)
        return json.dumps(data)

    except Exception as e:
        logger.error(f"Home feed error: {e}")
        # Return error response in a consistent format
        error_response = {
            "error": "service_error", 
            "message": "Unable to fetch home feed",
            "details": str(e) if len(str(e)) < 200 else str(e)[:200] + "..."
        }
        return json.dumps(error_response)

def search(query, filter_type='songs', limit=10):
    """Search YouTube Music with caching"""
    cache_key = _get_cache_key("search", query=query, filter=filter_type, limit=limit)

    # Try cache first (shorter TTL for search)
    cached = _get_cached_result(cache_key)
    if cached:
        logger.info(f"Returning cached search results for: {query}")
        return json.dumps(cached)

    try:
        logger.info(f"Searching for: {query}")
        ytmusic = get_ytmusic_session()
        
        # Handle database/operational errors specifically
        try:
            results = ytmusic.search(query, filter=filter_type, limit=limit)
        except Exception as db_error:
            if "unable to open database file" in str(db_error).lower() or "operationalerror" in str(db_error).lower():
                logger.error(f"Database access error in search: {db_error}")
                # Return empty results to prevent app crash
                results = []
            else:
                raise db_error

        # Cache the result (search results have shorter TTL)
        _set_cached_result(cache_key, results)
        return json.dumps(results)

    except Exception as e:
        logger.error(f"Search error: {e}")
        # Return error response in a consistent format
        error_response = {
            "error": "service_error", 
            "message": "Search temporarily unavailable",
            "results": []
        }
        return json.dumps(error_response)

def get_stream_url(video_id):
    """Get stream URL for a video with caching"""
    cache_key = _get_cache_key("stream", video_id=video_id)

    # Try cache first (video URLs are stable, longer TTL)
    cached = _get_cached_result(cache_key)
    if cached:
        logger.info(f"Returning cached stream URL for video: {video_id}")
        return json.dumps(cached)

    try:
        logger.info(f"Getting stream URL for video: {video_id}")
        yt = pytube.YouTube(f"https://music.youtube.com/watch?v={video_id}")

        # Get best audio stream
        stream = yt.streams.get_audio_only()
        if not stream:
            raise Exception("No audio stream available")

        result = {
            "url": stream.url,
            "format": stream.mime_type,
            "quality": stream.abr,
            "bitrate": stream.bitrate,
            "title": yt.title,
            "duration": yt.length,
            "thumbnail": yt.thumbnail_url
        }

        # Cache the result
        _set_cached_result(cache_key, result)
        return json.dumps(result)

    except Exception as e:
        logger.error(f"Stream URL error for {video_id}: {e}")
        return json.dumps({"error": str(e)})

def get_charts(country_code='IN'):
    """Get charts for a country with caching"""
    cache_key = _get_cache_key("charts", country=country_code)

    # Try cache first
    cached = _get_cached_result(cache_key)
    if cached:
        logger.info(f"Returning cached charts for: {country_code}")
        return json.dumps(cached)

    try:
        logger.info(f"Getting charts for: {country_code}")
        ytmusic = get_ytmusic_session()
        
        # Handle database/operational errors specifically
        try:
            charts = ytmusic.get_charts(country=country_code)
        except Exception as db_error:
            if "unable to open database file" in str(db_error).lower() or "operationalerror" in str(db_error).lower():
                logger.error(f"Database access error in get_charts: {db_error}")
                # Return empty charts to prevent app crash
                charts = {"videos": [], "artists": [], "genres": []}
            else:
                raise db_error

        # Cache the result
        _set_cached_result(cache_key, charts)
        return json.dumps(charts)

    except Exception as e:
        logger.error(f"Charts error: {e}")
        # Return error response in a consistent format
        error_response = {
            "error": "service_error", 
            "message": "Charts temporarily unavailable",
            "videos": [],
            "artists": [],
            "genres": []
        }
        return json.dumps(error_response)

def clear_cache():
    """Clear all cached data"""
    try:
        global _memory_cache, _cache_initialized
        
        # Clear memory cache
        _memory_cache.clear()
        
        # Clear disk cache if available
        if _cache is not None and _cache_initialized:
            _cache.clear()
        
        logger.info("Cache cleared successfully")
        return json.dumps({"status": "success", "message": "Cache cleared"})
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        return json.dumps({"error": str(e)})

def reset_ytmusic_session():
    """Reset YTMusic session to force re-initialization"""
    global _ytmusic_session
    _ytmusic_session = None
    logger.info("YTMusic session reset successfully")
    return json.dumps({"status": "success", "message": "YTMusic session reset"})

def force_module_reload():
    """Force reload the module by clearing Python caches"""
    try:
        import sys
        import importlib
        
        # Remove module from sys.modules to force reload
        modules_to_remove = [key for key in sys.modules.keys() if 'youtube_api' in key or 'ytmusicapi' in key]
        for module_name in modules_to_remove:
            if module_name in sys.modules:
                del sys.modules[module_name]
        
        # Force reload this module
        importlib.reload(sys.modules[__name__])
        
        logger.info("Module reload completed successfully")
        return json.dumps({"status": "success", "message": "Module reloaded", "cleared_modules": len(modules_to_remove)})
    except Exception as e:
        logger.error(f"Module reload failed: {e}")
        return json.dumps({"error": str(e)})

def get_diagnostics():
    """Get diagnostic information about the current state"""
    try:
        diagnostics = {
            "cache_initialized": _cache_initialized,
            "cache_type": "diskcache" if (_cache is not None and _cache_initialized) else "memory",
            "ytmusic_session": "initialized" if _ytmusic_session is not None else "not_initialized",
            "ytmusic_type": type(_ytmusic_session).__name__ if _ytmusic_session else None,
            "cache_size": len(_memory_cache),
            "temp_dir": tempfile.gettempdir(),
            "working_dir": os.getcwd()
        }
        
        # Try to test if YTMusic can be initialized
        try:
            test_session = ytmusicapi.YTMusic(language='en', location='IN')
            diagnostics["ytmusic_test"] = "success"
        except Exception as e:
            diagnostics["ytmusic_test"] = f"failed: {str(e)[:100]}"
        
        return json.dumps({"status": "success", "diagnostics": diagnostics})
    except Exception as e:
        logger.error(f"Diagnostics error: {e}")
        return json.dumps({"error": str(e)})

# Initialize cache when module is loaded
try:
    _cache_initialized = init_cache()
    logger.info(f"Cache initialization completed. Status: {_cache_initialized}")
except Exception as e:
    logger.error(f"Cache initialization failed during module load: {e}")
    _cache_initialized = False

def get_video_info(video_id):
    """Get detailed video information using pytubefix"""
    try:
        logger.info(f"Getting video info for: {video_id}")
        yt = pytube.YouTube(f"https://music.youtube.com/watch?v={video_id}")

        return json.dumps({
            "video_id": video_id,
            "title": yt.title,
            "length": yt.length,
            "views": yt.views,
            "rating": yt.rating,
            "description": yt.description,
            "thumbnail": yt.thumbnail_url,
            "author": yt.author
        })
    except Exception as e:
        logger.error(f"Video info error for {video_id}: {e}")
        return json.dumps({"error": str(e)})

def get_adaptive_streams(video_id):
    """Get adaptive (DASH) streams for better quality"""
    try:
        logger.info(f"Getting adaptive streams for: {video_id}")
        yt = pytube.YouTube(f"https://music.youtube.com/watch?v={video_id}")

        dash_audio_streams = yt.streams.filter(only_audio=True, adaptive=True)
        dash_video_streams = yt.streams.filter(only_video=True, adaptive=True)

        return json.dumps({
            "video_id": video_id,
            "title": yt.title,
            "dash_audio": [{
                "itag": stream.itag,
                "mime_type": stream.mime_type,
                "codecs": getattr(stream, 'video_codec', None),
                "quality": stream.abr or stream.resolution,
                "bitrate": stream.bitrate,
                "url": stream.url,
                "filesize": getattr(stream, 'filesize', None)
            } for stream in dash_audio_streams],
            "dash_video": [{
                "itag": stream.itag,
                "mime_type": stream.mime_type,
                "codecs": getattr(stream, 'video_codec', None),
                "quality": stream.resolution,
                "fps": stream.fps,
                "bitrate": stream.bitrate,
                "url": stream.url,
                "filesize": getattr(stream, 'filesize', None)
            } for stream in dash_video_streams]
        })
    except Exception as e:
        logger.error(f"Adaptive streams error for {video_id}: {e}")
        return json.dumps({"error": str(e)})

def get_highest_quality_stream(video_id, audio_only=True):
    """Get the highest quality stream available"""
    try:
        logger.info(f"Getting highest quality stream for: {video_id}")
        yt = pytube.YouTube(f"https://music.youtube.com/watch?v={video_id}")

        streams = yt.streams.filter(only_audio=audio_only)
        if not streams:
            return json.dumps({"error": "No streams available"})

        # Sort by quality/bitrate
        sorted_streams = streams.order_by('abr').desc() if audio_only else streams.order_by('resolution').desc()
        best_stream = sorted_streams.first()

        return json.dumps({
            "video_id": video_id,
            "title": yt.title,
            "url": best_stream.url,
            "quality": best_stream.abr if audio_only else best_stream.resolution,
            "mime_type": best_stream.mime_type,
            "bitrate": best_stream.bitrate,
            "filesize": getattr(best_stream, 'filesize', None),
            "audio_only": audio_only
        })
    except Exception as e:
        logger.error(f"Highest quality stream error for {video_id}: {e}")
        return json.dumps({"error": str(e)})

def search_and_stream(song_name, artist_name=""):
    """Combined search and stream function based on reference app.py"""
    try:
        logger.info(f"Searching and streaming: {song_name} by {artist_name}")
        query = f"{song_name} {artist_name}".strip()

        # Search for the song
        ytmusic = get_ytmusic_session()
        results = ytmusic.search(query, filter="songs", limit=5)

        if not results:
            return json.dumps({"error": "No results found"})

        # Use first result
        first = results[0]
        video_id = first.get('videoId')
        if not video_id:
            return json.dumps({"error": "No videoId found"})

        # Check if stream is cached
        stream_cache_key = _get_cache_key("stream_detail", video_id=video_id)
        cached_stream = _get_cached_result(stream_cache_key)
        if cached_stream:
            logger.info(f"Returning cached detailed stream for: {video_id}")
            return json.dumps(cached_stream)

        # Get stream URL
        yt = pytube.YouTube(f"https://music.youtube.com/watch?v={video_id}")
        audio_streams = yt.streams.filter(only_audio=True).order_by('abr').desc()

        if not audio_streams:
            return json.dumps({"error": "No audio streams available"})

        best_audio = audio_streams.first()

        result = {
            "title": yt.title,
            "artists": ', '.join([a.get('name') for a in first.get('artists', [])]),
            "video_id": video_id,
            "stream_url": best_audio.url,
            "thumbnail": yt.thumbnail_url,
            "quality": best_audio.abr,
            "bitrate": best_audio.bitrate,
            "codec": best_audio.mime_type,
            "duration": yt.length,
            "all_formats": [{
                "itag": stream.itag,
                "quality": stream.abr,
                "bitrate": stream.bitrate,
                "codec": stream.mime_type,
                "url": stream.url,
                "filesize": stream.filesize,
            } for stream in audio_streams]
        }

        # Cache detailed result
        _set_cached_result(stream_cache_key, result)
        return json.dumps(result)

    except Exception as e:
        if "BotDetection" in str(e):
            logger.warning(f"Bot detection triggered for: {query}")
            return json.dumps({"error": "Service temporarily unavailable due to bot detection"})
        logger.error(f"Search and stream error: {e}")
        return json.dumps({"error": str(e)})

# Bridge function called from Java/Kotlin
def call_function(func_name, params=None):
    """Main bridge function for Native Module calls"""
    if params is None:
        params = {}

    logger.info(f"Bridge call: {func_name}")

    try:
        if func_name == "get_home":
            return get_home(params.get('limit', 10))
        elif func_name == "search":
            return search(params.get('query', ''), params.get('filter', 'songs'), params.get('limit', 10))
        elif func_name == "get_stream_url":
            return get_stream_url(params.get('video_id', ''))
        elif func_name == "get_charts":
            return get_charts(params.get('country', 'IN'))
        elif func_name == "search_and_stream":
            return search_and_stream(params.get('song_name', ''), params.get('artist_name', ''))
        elif func_name == "get_video_info":
            return get_video_info(params.get('video_id', ''))
        elif func_name == "get_adaptive_streams":
            return get_adaptive_streams(params.get('video_id', ''))
        elif func_name == "get_highest_quality_stream":
            return get_highest_quality_stream(params.get('video_id', ''), params.get('audio_only', True))
        elif func_name == "clear_cache":
            return clear_cache()
        elif func_name == "reset_ytmusic_session":
            return reset_ytmusic_session()
        elif func_name == "force_module_reload":
            return force_module_reload()
        elif func_name == "get_diagnostics":
            return get_diagnostics()
        else:
            logger.warning(f"Unknown function: {func_name}")
            return json.dumps({"error": f"Unknown function: {func_name}"})

    except Exception as e:
        logger.error(f"Bridge error in {func_name}: {e}")
        return json.dumps({"error": str(e)})
