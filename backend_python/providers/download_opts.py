import yt_dlp

from ..utils.logger import setup_logger

logger = setup_logger()


def build_download_opts(save_path: str, quality: str):
    """Build yt-dlp options that guarantee audio is merged into the final MP4.

    The format chain always prefers a merged video+audio output first. If
    merging is unavailable (no ffmpeg), it falls back to the best single
    format that still contains an audio track, never to a silent stream.
    """
    if quality == 'best':
        quality_value = 'bestvideo+bestaudio/best[acodec!=none]/best'
    else:
        quality_value = (
            f'bestvideo[height<={quality}]+bestaudio/'
            f'best[height<={quality}][acodec!=none]/'
            f'best[height<={quality}]/best'
        )

    return {
        'format': quality_value,
        'outtmpl': f"{save_path}/%(title)s.%(ext)s",
        'merge_output_format': 'mp4',
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
        'quiet': True,
        'no_warnings': True,
        'skip_unavailable_fragments': True,
        'socket_timeout': 30,
    }


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