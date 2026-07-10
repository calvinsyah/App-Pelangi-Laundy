export const getLastDayOfMonth = (periodeYYYYMM: string): string => {
  const [y, m] = periodeYYYYMM.split('-').map(Number);
  return `${periodeYYYYMM}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

export const getMonthRange = (periode: string) => ({
  start: `${periode}-01`,
  end: getLastDayOfMonth(periode)
});
