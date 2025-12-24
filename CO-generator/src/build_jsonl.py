import json
import os
from pathlib import Path
from preprocess import clean_text
from chunker import chunk_text

EXTRACTED_DIR = "data/extracted"
OUT_DIR = "data/jsonl"
os.makedirs(OUT_DIR, exist_ok=True)

TRAIN_PATH = os.path.join(OUT_DIR, "train.jsonl")

def build_jsonl():
    files = list(Path(EXTRACTED_DIR).glob("*.txt"))
    data = []

    for file in files:
        raw = file.read_text(encoding="utf-8")
        clean = clean_text(raw)
        chunks = chunk_text(clean)

        for ch in chunks:
            entry = {
                "instruction": "Generate 5 concise Course Outcomes (COs) from this module content:\n" + ch,
                "output": "CO1: <fill later>\nCO2: <fill later>\nCO3: <fill later>\nCO4: <fill later>\nCO5: <fill later>"
            }
            data.append(entry)

    with open(TRAIN_PATH, "w", encoding="utf-8") as f:
        for d in data:
            f.write(json.dumps(d) + "\n")

    print("JSONL created at:", TRAIN_PATH)
    print("Total samples:", len(data))


if __name__ == "__main__":
    build_jsonl()
