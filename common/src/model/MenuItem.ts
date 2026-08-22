/** Normalized menu item used across company and customer apps. */
export type MenuItem = {
  name: string
  description: string
  price: string
  imageUrl: string
  categories: string
  index?: number
}

/** Legacy company form keys (labels used as object keys). */
type LegacyMenuItem = {
  Name?: string
  Description?: string
  Price?: string
  "Image URL"?: string
  Categories?: string
  name?: string
  description?: string
  price?: string
  imageUrl?: string
  categories?: string
  index?: number
}

export function normalizeMenuItem(raw: LegacyMenuItem, index?: number): MenuItem {
  return {
    name: raw.name ?? raw.Name ?? "",
    description: raw.description ?? raw.Description ?? "",
    price: raw.price ?? raw.Price ?? "0",
    imageUrl: raw.imageUrl ?? raw["Image URL"] ?? "",
    categories: raw.categories ?? raw.Categories ?? "Uncategorized",
    index: index ?? raw.index,
  }
}

export function normalizeMenu(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((item, index) => normalizeMenuItem(item as LegacyMenuItem, index))
}

export function toLegacyMenuItem(item: MenuItem): LegacyMenuItem {
  return {
    Name: item.name,
    Description: item.description,
    Price: item.price,
    "Image URL": item.imageUrl,
    Categories: item.categories,
    index: item.index,
  }
}
