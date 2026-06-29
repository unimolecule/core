import { readdirSync } from "node:fs";
import process from "node:process";
import {
  generateProjectChangelog,
  writeProjectChangelog,
} from "@unconfig/changeset-workflow";
import { name } from "../../package.json";

const cwd = process.cwd();
const excludeFileNames = new Set([".DS_Store", "README.md"]);
const PKG_PREFIX = name.split("/", 1)[0];

function filterGuard(name: string) {
  return !excludeFileNames.has(name);
}

const apps = readdirSync(`${cwd}/apps`)
  .map((name) => `${PKG_PREFIX}/${name}`)
  .filter(filterGuard);

const packages = readdirSync(`${cwd}/packages`)
  .map((name) => `${PKG_PREFIX}/${name}`)
  .filter(filterGuard);

async function main() {
  const content = await generateProjectChangelog({
    packages,
    ignorePackages: apps,
    cwd,
  });

  await writeProjectChangelog({
    cwd,
    content,
    projectChangelogPath: "CHANGELOG.md",
    websiteChangelogPath: "apps/document/content/changelog.md",
  });
}

main();
