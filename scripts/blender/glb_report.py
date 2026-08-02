"""Dump glTF file-order node/animation/material names from a GLB.

The MillOS normalize pipeline renames animation clips *by index* and derives
mesh names from source material names, so file order is a contract. This
reports exactly what the pipeline will see.
Run: python3 scripts/blender/glb_report.py <glb> [...]
"""
import json, struct, sys

def read_glb_json(path):
    with open(path, "rb") as fh:
        data = fh.read()
    magic, version, _ = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, f"{path}: not a GLB"
    assert version == 2, f"{path}: not glTF 2.0"
    length, ctype = struct.unpack_from("<II", data, 12)
    assert ctype == 0x4E4F534A, f"{path}: first chunk is not JSON"
    return json.loads(data[20:20 + length].decode("utf-8").strip()), len(data)

for path in sys.argv[1:]:
    g, size = read_glb_json(path)
    print(f"\n===== {path}  ({size} bytes) =====")
    print("animations (file order):", [a.get("name") for a in g.get("animations", [])])
    print("materials  (file order):", [m.get("name") for m in g.get("materials", [])])
    print("meshes     (file order):", [m.get("name") for m in g.get("meshes", [])])
    nodes = [n.get("name") for n in g.get("nodes", [])]
    print(f"nodes: {len(nodes)}")
    for r in ["Wheels.B_1", "Wheels.F_3", "lift01_11", "lift02_9"]:
        print(f"   required node {r!r}: {'PRESENT' if r in nodes else 'MISSING'}")
    prims = sum(len(m.get("primitives", [])) for m in g.get("meshes", []))
    print("primitives:", prims, "| images:", len(g.get("images", [])))
