import os
import shutil
import subprocess

import yt_dlp

from ..utils.logger import setup_logger

logger = setup_logger()

_HAS_FFMPEG = bool(shutil.which('ffmpeg'))
_HAS_FFPROBE = bool(shutil.which('ffprobe'))


def build_download_opts(save_path: str, quality: str):
    """Build yt-dlp options that guarantee audio.

    When ffmpeg is available the preferred chain merges best video + best
    audio into an MP4. Without ffmpeg (merging is impossible) we skip
    video+audio entirely and pick the best single format that already
    contains an audio track, so users never get a silent video.
    """
    if quality == 'best':
        if _HAS_FFMPEG:
            quality_value = 'bestvideo+bestaudio/best[acodec!=none]/best'
        else:
            quality_value = 'best[acodec!=none]/best'
    else:
        if _HAS_FFMPEG:
            quality_value = (
                f'bestvideo[height<={quality}]+bestaudio/'
                f'best[height<={quality}][acodec!=none]/'
                f'best[height<={quality}]/best'
            )
        else:
            quality_value = (
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
        opts['postprocessors'] = [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }]

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


def download_with_audio(ydl_opts: dict, url: str):
    """Download the video and guarantee the output contains audio.

    If the first download (e.g. a video+audio merge) somehow produced a
    silent file, this re-downloads using the best single format that carries
    an audio track and overwrites the result.
    """
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filepath = resolve_filename(ydl, info)

        if _has_audio_stream(filepath):
            return info, filepath

        logger.warning(f"No audio stream found in {filepath}, re-downloading with audio-first format")

        audio_opts = dict(ydl_opts)
        audio_opts['format'] = 'best[acodec!=none]/best'
        audio_opts.pop('merge_output_format', None)
        audio_opts['postprocessors'] = []

        with yt_dlp.YoutubeDL(audio_opts) as ydl_retry:
            info = ydl_retry.extract_info(url, download=True)
            filepath = resolve_filename(ydl_retry, info)

        return info, filepath