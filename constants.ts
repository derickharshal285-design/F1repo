export const TEAM_COLORS = {
  RedBull: '#3671C6',
  Ferrari: '#E8002D',
  Mercedes: '#27F4D2',
  McLaren: '#FF8000',
  AstonMartin: '#229971',
  Alpine: '#0093CC',
  Williams: '#64C4FF',
  RB: '#6692FF',
  Sauber: '#52E252',
  Haas: '#B6BABD',
};

export const TYRE_COLORS = {
  SOFT: '#EF4444',   // Red
  MEDIUM: '#EAB308', // Yellow
  HARD: '#F9FAFB',   // White
  INTER: '#4ADE80',  // Green
  WET: '#3B82F6',    // Blue
};

export const REPLAY_FPS = 30;
export const TOTAL_LAPS = 57; // Note: This is specific to Bahrain, UI will adapt.

export const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

export const TRACKS = [
  { id: 'bahrain', name: 'Bahrain International Circuit', country: 'Bahrain' },
  { id: 'jeddah', name: 'Jeddah Corniche Circuit', country: 'Saudi Arabia' },
  { id: 'melbourne', name: 'Albert Park Circuit', country: 'Australia' },
  { id: 'suzuka', name: 'Suzuka International Racing Course', country: 'Japan' },
  { id: 'miami', name: 'Miami International Autodrome', country: 'USA' },
  { id: 'monaco', name: 'Circuit de Monaco', country: 'Monaco' },
  { id: 'canada', name: 'Circuit Gilles-Villeneuve', country: 'Canada' },
  { id: 'spain', name: 'Circuit de Barcelona-Catalunya', country: 'Spain' },
  { id: 'austria', name: 'Red Bull Ring', country: 'Austria' },
  { id: 'silverstone', name: 'Silverstone Circuit', country: 'UK' },
  { id: 'hungary', name: 'Hungaroring', country: 'Hungary' },
  { id: 'spa', name: 'Circuit de Spa-Francorchamps', country: 'Belgium' },
  { id: 'zandvoort', name: 'Circuit Zandvoort', country: 'Netherlands' },
  { id: 'monza', name: 'Autodromo Nazionale Monza', country: 'Italy' },
  { id: 'singapore', name: 'Marina Bay Street Circuit', country: 'Singapore' },
  { id: 'austin', name: 'Circuit of the Americas', country: 'USA' },
  { id: 'mexico', name: 'Autódromo Hermanos Rodríguez', country: 'Mexico' },
  { id: 'brazil', name: 'Interlagos Circuit', country: 'Brazil' },
  { id: 'vegas', name: 'Las Vegas Strip Circuit', country: 'USA' },
  { id: 'abudhabi', name: 'Yas Marina Circuit', country: 'UAE' },
];

export const ALL_DRIVERS = [
  { id: 'VER', name: 'M. Verstappen', team: 'Red Bull', color: TEAM_COLORS.RedBull },
  { id: 'PER', name: 'S. Perez', team: 'Red Bull', color: TEAM_COLORS.RedBull },
  { id: 'LEC', name: 'C. Leclerc', team: 'Ferrari', color: TEAM_COLORS.Ferrari },
  { id: 'SAI', name: 'C. Sainz', team: 'Ferrari', color: TEAM_COLORS.Ferrari },
  { id: 'HAM', name: 'L. Hamilton', team: 'Mercedes', color: TEAM_COLORS.Mercedes },
  { id: 'RUS', name: 'G. Russell', team: 'Mercedes', color: TEAM_COLORS.Mercedes },
  { id: 'NOR', name: 'L. Norris', team: 'McLaren', color: TEAM_COLORS.McLaren },
  { id: 'PIA', name: 'O. Piastri', team: 'McLaren', color: TEAM_COLORS.McLaren },
  { id: 'ALO', name: 'F. Alonso', team: 'Aston Martin', color: TEAM_COLORS.AstonMartin },
  { id: 'STR', name: 'L. Stroll', team: 'Aston Martin', color: TEAM_COLORS.AstonMartin },
  { id: 'GAS', name: 'P. Gasly', team: 'Alpine', color: TEAM_COLORS.Alpine },
  { id: 'OCO', name: 'E. Ocon', team: 'Alpine', color: TEAM_COLORS.Alpine },
  { id: 'ALB', name: 'A. Albon', team: 'Williams', color: TEAM_COLORS.Williams },
  { id: 'SAR', name: 'L. Sargeant', team: 'Williams', color: TEAM_COLORS.Williams },
  { id: 'TSU', name: 'Y. Tsunoda', team: 'RB', color: TEAM_COLORS.RB },
  { id: 'RIC', name: 'D. Ricciardo', team: 'RB', color: TEAM_COLORS.RB },
  { id: 'BOT', name: 'V. Bottas', team: 'Sauber', color: TEAM_COLORS.Sauber },
  { id: 'ZHO', name: 'G. Zhou', team: 'Sauber', color: TEAM_COLORS.Sauber },
  { id: 'MAG', name: 'K. Magnussen', team: 'Haas', color: TEAM_COLORS.Haas },
  { id: 'HUL', name: 'N. Hulkenberg', team: 'Haas', color: TEAM_COLORS.Haas },
] as const;