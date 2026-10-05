import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

const cache = new Map<string, string>();

const MALE_HAIR = ["buzzcut", "fade", "shortCombover", "curlyHighTop", "shortComboverChops"] as const;
const FEMALE_HAIR = ["bobCut", "curlyBun", "long", "extraLong", "straightBun", "bobBangs", "curly"] as const;

/** Locally generated portrait used as the ID photo (no network, no real faces). */
export function avatarUri(seed: string, gender?: "M" | "F" | string): string {
  const key = `${seed}|${gender ?? ""}`;
  let v = cache.get(key);
  if (!v) {
    v = createAvatar(personas, {
      seed,
      backgroundColor: ["e7f6f1", "eef2f7", "f4f4f4", "fdf3e7"],
      skinColor: ["623d36", "92594b", "b16a5b", "8a5a44"],
      ...(gender === "M" ? { hair: [...MALE_HAIR], facialHairProbability: 25 } : gender === "F" ? { hair: [...FEMALE_HAIR], facialHairProbability: 0 } : {}),
    }).toDataUri();
    cache.set(key, v);
  }
  return v;
}
