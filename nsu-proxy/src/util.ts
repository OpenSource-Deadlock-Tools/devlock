import fs from "node:fs/promises";
export function pTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
}

export async function fileExists(p: string) {
  try {
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}

export const sleep = (ms: number) => new Promise((res, _rej) => setTimeout(res, ms));
