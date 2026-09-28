import fs from "node:fs";

const filePath = process.argv[2];
if (!filePath) {
  throw new Error("Usage: node tools/inspect-glb.mjs <file.glb>");
}

const buffer = fs.readFileSync(filePath);
if (buffer.toString("ascii", 0, 4) !== "glTF") {
  throw new Error("Not a GLB file");
}
const jsonLength = buffer.readUInt32LE(12);
const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));

console.log(
  JSON.stringify(
    {
      asset: json.asset,
      meshes: (json.meshes ?? []).map((mesh, index) => ({ index, name: mesh.name })),
      meshNodes: (json.nodes ?? [])
        .map((node, index) => ({ index, name: node.name, mesh: node.mesh }))
        .filter((node) => node.mesh !== undefined),
      transformNodes: (json.nodes ?? [])
        .map((node, index) => ({
          index,
          name: node.name,
          mesh: node.mesh,
          skin: node.skin,
          children: node.children,
        }))
        .filter((node) => node.mesh === undefined),
      scenes: json.scenes,
    },
    null,
    2,
  ),
);
