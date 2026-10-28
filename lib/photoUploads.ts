// The admin photo picker's state: saved photos plus uploads in flight, in
// strip order. Only finished uploads are ever saved.
// preview is a local blob: URL shown while an upload is in flight.
export type PhotoItem = {
  key: string;
  status: "uploading" | "done" | "error";
  url?: string;
  preview?: string;
  error?: string;
};

export type PhotoAction =
  | { type: "add"; key: string; preview?: string }
  | { type: "uploaded"; key: string; url: string }
  | { type: "failed"; key: string; error: string }
  | { type: "retry"; key: string }
  | { type: "remove"; key: string }
  | { type: "move"; key: string; by: -1 | 1 };

export function initialPhotos(urls: string[]): PhotoItem[] {
  return urls.map((url) => ({ key: url, status: "done", url }));
}

export function photoReducer(items: PhotoItem[], action: PhotoAction): PhotoItem[] {
  const update = (patch: Partial<PhotoItem>) =>
    items.map((item) => (item.key === action.key ? { ...item, ...patch } : item));

  switch (action.type) {
    case "add":
      return [...items, { key: action.key, status: "uploading", preview: action.preview }];
    case "uploaded":
      return update({ status: "done", url: action.url, error: undefined });
    case "failed":
      return update({ status: "error", error: action.error });
    case "retry":
      return update({ status: "uploading", error: undefined });
    case "remove":
      return items.filter((item) => item.key !== action.key);
    case "move": {
      const from = items.findIndex((item) => item.key === action.key);
      const to = from + action.by;
      if (from === -1 || to < 0 || to >= items.length) return items;
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    }
  }
}

export function savedUrls(items: PhotoItem[]): string[] {
  return items.flatMap((item) => (item.status === "done" && item.url ? [item.url] : []));
}

export function uploadingCount(items: PhotoItem[]): number {
  return items.filter((item) => item.status === "uploading").length;
}
