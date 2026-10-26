import json, re, subprocess
from pathlib import Path
from PIL import Image, ImageOps

SRC = Path("/Users/danielegobbin/Pictures/dangobbin gallery")
DEST = Path("/Users/danielegobbin/Desktop/CLAUDE/dangobbin-portfolio/photos")
MAX_DIM = 2200

def slugify(stem: str) -> str:
    s = stem.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "photo"

def serialize(stem: str) -> str:
    # a stable, human-readable id from the camera's own filename
    # (e.g. "_RF_7041" -> "RF-7041"), so Daniele can trace a photo
    # back to the original file in Lightroom if it needs replacing.
    s = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-")
    return s.upper() or "PHOTO"

# recurse into year subfolders (2022/, 2025/, 2026/, ...)
files = sorted(
    p for p in SRC.rglob("*")
    if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png") and not p.name.startswith(".")
)

captions = {}
keywords = {}
if files:
    out = subprocess.run(
        ["exiftool", "-j", "-IPTC:Caption-Abstract", "-XMP:Description", "-EXIF:ImageDescription",
         "-IPTC:Keywords", "-XMP:Subject"]
        + [str(p) for p in files],
        capture_output=True, text=True, check=True,
    )
    for row in json.loads(out.stdout):
        cap = row.get("Caption-Abstract") or row.get("Description") or row.get("ImageDescription")
        cap = (cap or "").strip()
        if cap:
            captions[row["SourceFile"]] = cap
        kw = row.get("Keywords") or row.get("Subject")
        if kw:
            keywords[row["SourceFile"]] = kw if isinstance(kw, list) else [kw]

entries = []
used_names = set()
with_caption = 0

for p in files:
    year = p.parent.name  # the year subfolder this photo lives in
    base = f"dangobbin-{year}-{slugify(p.stem)}"
    name = base
    i = 2
    while name in used_names:
        name = f"{base}-{i}"
        i += 1
    used_names.add(name)
    out_path = DEST / f"{name}.jpg"

    img = Image.open(p)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)

    clean = Image.new("RGB", img.size)
    clean.putdata(list(img.getdata()))
    clean.save(out_path, "JPEG", quality=85, optimize=True)  # no exif= -> no metadata written

    caption = captions.get(str(p))
    if caption:
        with_caption += 1
    else:
        caption = f"Caption placeholder, {year}"

    entries.append({
        "src": f"photos/{out_path.name}",
        "alt": caption,  # real, descriptive alt text (SEO + accessibility) instead of a generic "Photo, year"
        "caption": caption,
        "year": int(year),
        "serial": serialize(p.stem),
        "keywords": keywords.get(str(p), []),
    })
    print(f"{p.relative_to(SRC)} -> {out_path.name}  [{'caption' if caption and 'placeholder' not in caption.lower() else 'placeholder'}]")

manifest_path = DEST / "manifest.json"
manifest_path.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n")

print(f"\n{len(entries)} foto importate, {with_caption} con didascalia reale, le altre con segnaposto + anno.")
print(f"Manifest totale: {len(entries)} voci (foto demo iniziali escluse: non fanno parte dell'archivio reale).")
