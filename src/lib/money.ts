export const formatGBP = (v?: number | null) =>
  typeof v === "number"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v)
    : "—";