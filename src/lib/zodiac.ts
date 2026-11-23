const SIGNS: { name: string; symbol: string; month: number; day: number }[] = [
  { name: "Capricornio", symbol: "♑", month: 0, day: 1 },
  { name: "Acuario", symbol: "♒", month: 0, day: 20 },
  { name: "Piscis", symbol: "♓", month: 1, day: 19 },
  { name: "Aries", symbol: "♈", month: 2, day: 21 },
  { name: "Tauro", symbol: "♉", month: 3, day: 20 },
  { name: "Géminis", symbol: "♊", month: 4, day: 21 },
  { name: "Cáncer", symbol: "♋", month: 5, day: 21 },
  { name: "Leo", symbol: "♌", month: 6, day: 23 },
  { name: "Virgo", symbol: "♍", month: 7, day: 23 },
  { name: "Libra", symbol: "♎", month: 8, day: 23 },
  { name: "Escorpio", symbol: "♏", month: 9, day: 23 },
  { name: "Sagitario", symbol: "♐", month: 10, day: 22 },
  { name: "Capricornio", symbol: "♑", month: 11, day: 22 },
];

/** Western zodiac sign of a date, as printed on traditional wall calendars. */
export function zodiacOf(date: Date): { name: string; symbol: string } {
  const key = date.getMonth() * 100 + date.getDate();
  let found = SIGNS[0];
  for (const sign of SIGNS) if (sign.month * 100 + sign.day <= key) found = sign;
  return found;
}
