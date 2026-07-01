import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function createFixture(files: Record<string, string>) {
  const root = await mkdtemp(path.join(tmpdir(), "monorepo-tsconfig-paths-"));

  await Promise.all(
    Object.entries(files).map(async ([filePath, contents]) => {
      const absolutePath = path.join(root, filePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, contents);
    }),
  );

  return {
    root,
    path: (...segments: string[]) => path.join(root, ...segments),
  };
}
