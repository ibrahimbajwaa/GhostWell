"use client";
import { useEffect, useState } from "react";
import { decode, type Well } from "./types";

// Loaded once per visit and shared by every page that needs the full well list.
let cache: Promise<Well[]> | null = null;

export function loadWells() {
  if (!cache) {
    cache = fetch("/wells.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(decode)
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

export function useWells() {
  const [wells, setWells] = useState<Well[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    loadWells().then((w) => live && setWells(w)).catch(() => live && setError(true));
    return () => { live = false; };
  }, []);
  return { wells, error };
}
