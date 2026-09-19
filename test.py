import subprocess
import urllib.request
import re

MPV_PATH = "mpv"
M3U_URL = "https://iptv-org.github.io/iptv/index.m3u"


def load_channels():
    print("Loading IPTV playlist...")

    data = urllib.request.urlopen(M3U_URL).read().decode("utf-8")

    lines = data.splitlines()
    channels = []

    current_name = None
    current_info = None

    for line in lines:
        line = line.strip()

        if line.startswith("#EXTINF:"):
            current_info = line

            # Get channel name after the last comma
            if "," in line:
                current_name = line.split(",", 1)[1].strip()

        elif line.startswith("http://") or line.startswith("https://"):
            if current_name:
                channels.append({
                    "name": current_name,
                    "url": line
                })

                current_name = None

    return channels


def search_channels(channels, search):
    search = search.lower()

    return [
        channel
        for channel in channels
        if search in channel["name"].lower()
    ]


def play_channel(channel):
    print("\nPlaying:", channel["name"])
    print("URL:", channel["url"])

    subprocess.run([
        MPV_PATH,
        channel["url"]
    ])


def main():
    print("================================")
    print("       IPTV SEARCH PLAYER")
    print("================================")

    channels = load_channels()

    print(f"\nLoaded {len(channels)} channels.")

    while True:
        search = input(
            "\nSearch channel (or type exit): "
        ).strip()

        if search.lower() == "exit":
            break

        results = search_channels(channels, search)

        if not results:
            print("No channels found.")
            continue

        print(f"\nFound {len(results)} channels:\n")

        # Show maximum 20 results
        for i, channel in enumerate(results[:150], 1):
            print(f"{i}. {channel['name']}")

        choice = input(
            "\nEnter channel number to play (or Enter to search again): "
        ).strip()

        if not choice:
            continue

        try:
            index = int(choice) - 1

            if 0 <= index < min(len(results), 200):
                play_channel(results[index])
            else:
                print("Invalid channel number.")

        except ValueError:
            print("Please enter a valid number.")


if __name__ == "__main__":
    main()