#!/usr/bin/env python3
"""Map local Whisper word timestamps onto the canonical MillOS lyric sheets."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SONGBOOK = ROOT / "docs" / "MILLOS_SUNO_SONGBOOK.md"
AUDIO_DIR = ROOT / "public" / "audio" / "millos-originals"
OUTPUT = AUDIO_DIR / "lyric-alignment.json"
TRACK_IDS = [
    "d140bfb7-f462-43e7-8673-ad659a27fdf0",
    "261fb36b-54dc-49a3-aebc-3daf01b5c93f",
    "53ef33f5-420a-4694-8d06-422c65964776",
    "0b33cbf8-d6fd-4978-a7bc-64f0a05be03f",
    "2a4ba9da-a263-4ae4-bfa9-48945ea632d8",
    "d27d7e18-debd-4e0b-8b7e-85d3fa50e39b",
    "ebc76c4c-22a7-4eb2-b703-a0f92d8935e5e",
    "42f46ca5-69c0-44c6-be8d-b51538fa0da3",
]


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold().replace("’", "'"))


def parse_songbook() -> list[dict]:
    source = SONGBOOK.read_text()
    pattern = re.compile(
        r"^## (\d+)\. (.+)\n[\s\S]*?\*\*Lyrics:\*\*\n\n```text\n([\s\S]*?)\n```",
        re.MULTILINE,
    )
    tracks = []
    for match in pattern.finditer(source):
        number = int(match.group(1))
        lines = []
        flat_words = []
        for line_index, text in enumerate(match.group(3).splitlines()):
            if not text:
                kind = "blank"
                words = []
            elif re.fullmatch(r"\[[^\]]+\]", text):
                kind = "section"
                words = []
            else:
                kind = "lyric"
                words = re.findall(r"\S+", text)
                for word_index, word in enumerate(words):
                    flat_words.append(
                        {
                            "text": word,
                            "normalized": normalize(word),
                            "lineIndex": line_index,
                            "wordIndex": word_index,
                        }
                    )
            lines.append({"kind": kind, "text": text, "words": words})
        tracks.append(
            {
                "number": number,
                "title": match.group(2).strip(),
                "lyrics": match.group(3),
                "lines": lines,
                "flatWords": flat_words,
            }
        )
    if [track["number"] for track in tracks] != list(range(1, 9)):
        raise RuntimeError("songbook must contain exactly eight numbered lyric sheets")
    return tracks


def source_words(payload: dict) -> list[dict]:
    words = []
    for segment in payload.get("segments", []):
        for source in segment.get("words", []):
            lexical = re.findall(r"[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*", source["word"])
            for word in lexical:
                words.append(
                    {
                        "text": word,
                        "normalized": normalize(word),
                        "startSeconds": round(float(source["start"]), 3),
                        "endSeconds": round(float(source["end"]), 3),
                        "confidence": round(float(source.get("probability", 0)), 6),
                    }
                )
    return words


def lcs_matches(canonical: list[dict], source: list[dict]) -> dict[int, int]:
    rows = len(canonical) + 1
    columns = len(source) + 1
    matrix = [[0] * columns for _ in range(rows)]
    for canonical_index in range(1, rows):
        for source_index in range(1, columns):
            if canonical[canonical_index - 1]["normalized"] == source[source_index - 1]["normalized"]:
                matrix[canonical_index][source_index] = matrix[canonical_index - 1][source_index - 1] + 1
            else:
                matrix[canonical_index][source_index] = max(
                    matrix[canonical_index - 1][source_index],
                    matrix[canonical_index][source_index - 1],
                )
    matches = {}
    canonical_index = len(canonical)
    source_index = len(source)
    while canonical_index > 0 and source_index > 0:
        if canonical[canonical_index - 1]["normalized"] == source[source_index - 1]["normalized"]:
            matches[canonical_index - 1] = source_index - 1
            canonical_index -= 1
            source_index -= 1
        elif matrix[canonical_index - 1][source_index] >= matrix[canonical_index][source_index - 1]:
            canonical_index -= 1
        else:
            source_index -= 1
    return matches


def interpolate_words(
    canonical: list[dict], source: list[dict], matches: dict[int, int], duration: float
) -> list[dict]:
    result: list[dict | None] = [None] * len(canonical)
    for canonical_index, source_index in matches.items():
        timing = source[source_index]
        result[canonical_index] = {
            "text": canonical[canonical_index]["text"],
            "startSeconds": timing["startSeconds"],
            "endSeconds": timing["endSeconds"],
            "confidence": timing["confidence"],
            "success": True,
        }

    anchors = [-1, *sorted(matches), len(canonical)]
    first_source_start = source[0]["startSeconds"] if source else 0.0
    last_source_end = source[-1]["endSeconds"] if source else duration
    for anchor_position in range(len(anchors) - 1):
        left_index = anchors[anchor_position]
        right_index = anchors[anchor_position + 1]
        missing = list(range(left_index + 1, right_index))
        if not missing:
            continue
        if left_index >= 0:
            window_start = float(result[left_index]["endSeconds"])
        else:
            right_start = float(result[right_index]["startSeconds"]) if right_index < len(canonical) else first_source_start
            window_start = max(first_source_start, right_start - len(missing) * 0.36)
        if right_index < len(canonical):
            window_end = float(result[right_index]["startSeconds"])
        else:
            window_end = min(duration, max(last_source_end, window_start + len(missing) * 0.36))
        if window_end <= window_start:
            window_end = min(duration, window_start + max(0.08, len(missing) * 0.08))
        slot = (window_end - window_start) / len(missing)
        for offset, canonical_index in enumerate(missing):
            start = window_start + slot * offset
            end = min(window_end, start + max(0.04, slot * 0.88))
            result[canonical_index] = {
                "text": canonical[canonical_index]["text"],
                "startSeconds": round(start, 3),
                "endSeconds": round(max(start, end), 3),
                "confidence": 0,
                "success": False,
            }
    ordered = [word for word in result if word is not None]
    previous_start = 0.0
    for word in ordered:
        word["startSeconds"] = round(max(previous_start, float(word["startSeconds"])), 3)
        word["endSeconds"] = round(
            min(duration, max(float(word["startSeconds"]), float(word["endSeconds"]))), 3
        )
        previous_start = float(word["startSeconds"])
    return ordered


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asr-dir", type=Path, required=True)
    parser.add_argument("--model", default="mlx-community/whisper-large-v3-turbo")
    args = parser.parse_args()
    tracks = []
    for sheet, suno_id in zip(parse_songbook(), TRACK_IDS, strict=True):
        slug = re.sub(r"[^a-z0-9]+", "-", sheet["title"].casefold()).strip("-")
        asr_path = args.asr_dir / f"{sheet['number']:02d}-{slug}.json"
        if not asr_path.exists():
            raise RuntimeError(f"missing local ASR result: {asr_path}")
        payload = json.loads(asr_path.read_text())
        source = source_words(payload)
        matches = lcs_matches(sheet["flatWords"], source)
        audio_name = f"{sheet['number']:02d}-{slug}.mp3"
        import subprocess

        duration = float(
            subprocess.check_output(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    str(AUDIO_DIR / audio_name),
                ],
                text=True,
            ).strip()
        )
        words = interpolate_words(sheet["flatWords"], source, matches, duration)
        tracks.append(
            {
                "number": sheet["number"],
                "title": sheet["title"],
                "sunoId": suno_id,
                "audioFile": audio_name,
                "sourceService": "local machine alignment",
                "alignmentMethod": "MLX Whisper large-v3-turbo word timestamps mapped onto canonical lyrics with unmatched-token interpolation",
                "machineModel": args.model,
                "canonicalWordCount": len(words),
                "matchedCanonicalWords": len(matches),
                "interpolatedCanonicalWords": len(words) - len(matches),
                "matchCoverage": round(len(matches) / len(words), 6),
                "words": words,
            }
        )
        print(
            f"{sheet['number']:02d} {sheet['title']}: {len(matches)}/{len(words)} exact ASR tokens "
            f"({len(matches) / len(words):.1%})"
        )
    OUTPUT.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "generatedBy": "scripts/align-millos-soundtrack.py",
                "humanSynchronizationReviewed": False,
                "tracks": tracks,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
