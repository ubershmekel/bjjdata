import fg from "fast-glob";
import { promises as fs } from "fs";

import { Clip, MdData } from "./types";

function applyKeyValue(data: MdData, key: string, val: string) {
  if (key === "who") {
    data[key].push(val);
    return;
  }
  if (key === "clip") {
    const clip = new Clip();
    const [start, end, ...tagsClunky] = val.split("-");
    // Some tags contain '-' so we need to resplit `tagsClunky`
    const tags = tagsClunky.join("-").split(",");
    clip.start = start.trim();
    clip.end = end.trim();
    clip.tags = tags.map((it) => it.trim().toLowerCase());
    data.clips.push(clip);
    return;
  }
  if (key in data) {
    data[key] = val;
    return;
  }
  console.error("invalid key:", key);
}

function processMdFile(text: string) {
  let data = new MdData();
  for (let line of text.split("\n")) {
    line = line.trim();
    if (line.length === 0) {
      continue;
    }
    if (line[0] === "#") {
      data.title = line.slice(1).trim();
      continue;
    } else {
      const sepIndex = line.indexOf(":");
      const key = line.slice(0, sepIndex).trim().toLowerCase();
      const value = line.slice(sepIndex + 1).trim();
      applyKeyValue(data, key, value);
    }
  }
  return data;
}

async function ensureDir(path) {
  // Creates /tmp/a/apple, regardless of whether `/tmp` and /tmp/a exist.
  return fs.mkdir(path, { recursive: true }).catch((err) => {
    console.log("mkdir err", err);
  });
}

async function main() {
  const distPath = "../../dist";
  await ensureDir(distPath);
  const mdFiles = await fg(["../../data/**/*.md"]);
  const data = {
    created: new Date().toISOString(),
    entries: [] as MdData[],
  };
  for (const fpath of mdFiles) {
    console.log(fpath);
    const text = await fs.readFile(fpath, "utf-8");
    console.log("text", text);
    const entry = processMdFile(text);
    data.entries.push(entry);
    // console.log(JSON.stringify(entry));
    // break;
  }
  if (data.entries.length === 0) {
    console.error("found no entries, failed somehow");
    process.exit(1);
  }
  fs.writeFile(`${distPath}/data.json`, JSON.stringify(data, null, 2));
}

main();
