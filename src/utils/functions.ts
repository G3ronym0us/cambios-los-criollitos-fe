import { Role } from "./enums";

export const formatNumber = (num: number) => {
  if (!num) return "0.00";
  return num.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
};

export const getRoleOptions = () => {
  return Object.values(Role).map((role) => ({
    value: role,
    label: role,
  }));
};