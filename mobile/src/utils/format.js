export const formatPrice = (p) =>
  "Rp " + Number(p).toLocaleString("id-ID");

export const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export const formatDateShort = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
};