export const formatNumber = (num: number) => {
  if (!num) return "0.00";
  return num.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
};