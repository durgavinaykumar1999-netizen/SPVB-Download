import os
import shutil
import subprocess

import yt_dlp

from ..utils.logger import setup_logger

logger = setup_logger()

_HAS_FFMPEG = bool(shutil.which('ffmpeg'))
_HAS_FFPROBE = bool(shutil.which('ffprobe'))


def build_download_opts(save_path: str, quality: str):
    """Build yt-dlp options that guarantee H.264 video + AAC audio in MP4.

    IMPORTANT: We ALWAYS prefer H.264 over VP9 (VP9 not compatible with MP4 container).
    This is non-negotiable for WhatsApp, Instagram, Facebook compatibility.
    """
    if quality == 'best':
        # PRIORITY 1: H.264 + AAC (best compatibility)
        # PRIORITY 2: Any video + AAC (will convert VP9→H.264 post-download)
        # PRIORITY 3: Best single file with audio
        quality_value = 'bestvideo[vcodec^=avc1]+bestaudio[acodec=aac]/bestvideo+bestaudio[acodec=aac]/best[acodec!=none]/best'
    else:
        # Same priority for height-limited downloads
        quality_value = (
            f'bestvideo[height<={quality}][vcodec^=avc1]+bestaudio[acodec=aac]/'
            f'bestvideo[height<={quality}]+bestaudio[acodec=aac]/'
            f'best[height<={quality}][acodec!=none]/'
            f'best[height<={quality}]/best'
        )

    opts = {
        'format': quality_value,
        'outtmpl': f"{save_path}/%(title)s.%(ext)s",
        'quiet': True,
        'no_warnings': True,
        'skip_unavailable_fragments': True,
        'socket_timeout': 30,
        'noplaylist': True,
    }

    if _HAS_FFMPEG:
        opts['merge_output_format'] = 'mp4'
        opts['postprocessors'] = [
            {
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            },
            {
                'key': 'FFmpegVideoRemuxer',
                'preferedformat': 'mp4',
            }
        ]

    return opts


def resolve_filename(ydl: yt_dlp.YoutubeDL, info: dict) -> str:
    """Return the real on-disk file path after post-processing.

    ydl.prepare_filename returns the path based on the source extension
    (e.g. .webm), but post-processing re-muxes to .mp4, so the actual
    file has a different name.
    """
    for dl in info.get('requested_downloads') or []:
        filepath = dl.get('filepath')
        if filepath:
            return filepath

    prepared = ydl.prepare_filename(info)
    if prepared:
        return prepared

    raise RuntimeError("Could not determine downloaded file path")


def _has_audio_stream(filepath: str) -> bool:
    """Verify the downloaded file actually contains an audio stream."""
    if not _HAS_FFPROBE or not filepath or not os.path.exists(filepath):
        return True  # cannot verify -> assume OK and move on

    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'error',
                '-select_streams', 'a',
                '-show_entries', 'stream=codec_type',
                '-of', 'csv=p=0',
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return 'audio' in result.stdout
    except Exception as e:
        logger.warning(f"Audio check failed for {filepath}: {str(e)}")
        return True


def _has_h264_video(filepath: str) -> bool:
    """Check if video is H.264 (AVC) codec, not VP9."""
    if not _HAS_FFPROBE or not filepath or not os.path.exists(filepath):
        return True  # cannot verify -> assume OK

    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'error',
                '-select_streams', 'v',
                '-show_entries', 'stream=codec_name',
                '-of', 'csv=p=0',
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        codec = result.stdout.strip()
        # h264, avc = H.264 codec, vp9 = VP9 (not compatible with MP4)
        is_h264 = 'h264' in codec.lower() or 'avc' in codec.lower()
        if not is_h264:
            logger.warning(f"Video is {codec}, not H.264. May need re-encoding.")
        return is_h264
    except Exception as e:
        logger.warning(f"Codec check failed for {filepath}: {str(e)}")
        return True


def _convert_to_h264(filepath: str) -> str:
    """Convert video to H.264 if it's VP9 or other incompatible codec.

    CRITICAL: This ensures WhatsApp, Instagram, Facebook compatibility.
    VP9 is NOT supported in MP4 containers - must be H.264.
    """
    if not filepath or not os.path.exists(filepath):
        logger.error(f"File not found for H.264 conversion: {filepath}")
        return filepath

    if _has_h264_video(filepath):
        logger.info(f"Video already H.264: {filepath}")
        return filepath  # Already H.264, no conversion needed

    if not _HAS_FFMPEG:
        logger.error(f"FFmpeg not available - cannot convert VP9 to H.264. File will remain incompatible: {filepath}")
        return filepath

    logger.warning(f"Converting {filepath} to H.264 for WhatsApp/Instagram/Facebook compatibility")

    import tempfile
    import shutil as sh

    try:
        # Create temporary file for conversion
        temp_fd, temp_path = tempfile.mkstemp(suffix='.mp4')
        os.close(temp_fd)

        # Convert VP9/other codec to H.264 using FFmpeg
        # Use -y to auto-overwrite temp file
        result = subprocess.run(
            [
                'ffmpeg', '-y', '-i', filepath,
                '-c:v', 'libx264',  # H.264 video encoder
                '-preset', 'fast',  # Balance speed (ultrafast/fast/medium/slow)
                '-crf', '23',       # Quality: 0-51 (lower=better, 23=default)
                '-c:a', 'aac',      # AAC audio codec
                '-b:a', '128k',     # Audio bitrate
                temp_path,
            ],
            capture_output=True,
            timeout=3600,  # 1 hour max for large videos
        )

        if result.returncode == 0 and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            # Verify conversion was successful
            if _has_h264_video(temp_path):
                # Replace original with converted version
                sh.move(temp_path, filepath)
                logger.info(f"✅ Successfully converted to H.264: {filepath}")
                return filepath
            else:
                logger.error(f"Conversion failed - output is not H.264: {temp_path}")
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                return filepath
        else:
            stderr_msg = result.stderr.decode() if result.stderr else "Unknown error"
            logger.error(f"FFmpeg conversion failed (returncode={result.returncode}): {stderr_msg}")
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            return filepath  # Return original if conversion fails

    except subprocess.TimeoutExpired:
        logger.error(f"H.264 conversion timeout (>1 hour): {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"H.264 conversion error: {str(e)}")
        return filepath


def download_with_audio(ydl_opts: dict, url: str):
    """Download the video with H.264/AAC and guarantee audio.

    If the first download doesn't have audio or isn't H.264, this re-downloads
    or converts to ensure compatibility.
    """
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filepath = resolve_filename(ydl, info)

        # Check audio stream
        has_audio = _has_audio_stream(filepath)
        has_h264 = _has_h264_video(filepath)

        if has_audio and has_h264:
            return info, filepath  # Perfect! Audio + H.264

        # If missing audio, re-download with audio-first format
        if not has_audio:
            logger.warning(f"No audio stream found in {filepath}, re-downloading")
            audio_opts = dict(ydl_opts)
            audio_opts['format'] = 'best[acodec!=none]/best'
            audio_opts.pop('merge_output_format', None)
            audio_opts['postprocessors'] = []

            with yt_dlp.YoutubeDL(audio_opts) as ydl_retry:
                info = ydl_retry.extract_info(url, download=True)
                filepath = resolve_filename(ydl_retry, info)

        # If video codec is not H.264 (e.g., VP9), convert it
        if not _has_h264_video(filepath):
            logger.warning(f"Video is not H.264, converting to H.264/AAC")
            filepath = _convert_to_h264(filepath)

        return info, filepath