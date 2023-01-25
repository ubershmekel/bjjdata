import fg from "fast-glob";
import { MakeDirectoryOptions, promises as fs } from "fs";

class Clip {
  start: string = "";
  end: string = "";
  tags: string[] = [];
}

class MdData {
  header: string = "";
  link: string = "";
  date: string = "";
  who: string[] = [];
  clips: Clip[] = [];
}

function applyKeyValue(data: MdData, key: string, val: string) {
  if (key === "who") {
    data[key].push(val);
    return;
  }
  if (key === "clip") {
    const clip = new Clip();
    const [start, end, ...tags] = val.split(/[\-,]/g);
    clip.start = start;
    clip.end = end;
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
      data.header = line.slice(1).trim();
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
  await ensureDir("../dist");
  const mdFiles = await fg(["../data/**/*.md"]);
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
  fs.writeFile("../dist/data.json", JSON.stringify(data, null, 2));
}

main();
