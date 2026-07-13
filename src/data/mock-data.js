export const mockTournament = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "euro-2028",
  name: "EM 2028",
  short_name: "EURO 2028",
  status: "planning",
  starts_at: "2028-06-09T18:00:00+02:00",
  tips_deadline: "2028-06-09T17:45:00+02:00",
  host_label: "Storbritannia og Irland",
  buy_in: 600,
  participant_count: 64,
  prize_pool: 37800
};

export const mockLeaderboard = [
  {
    id: "p1",
    name: "Benjamin Barrios",
    rank: 1,
    points: 42.75,
    exact_hits: 5,
    form_points: 15.5,
    avatar_url: "",
    movement: 2
  },
  {
    id: "p2",
    name: "Javier",
    rank: 2,
    points: 39.5,
    exact_hits: 4,
    form_points: 11,
    avatar_url: "",
    movement: -1
  },
  {
    id: "p3",
    name: "Gaby",
    rank: 3,
    points: 34,
    exact_hits: 3,
    form_points: 13.25,
    avatar_url: "",
    movement: 1
  },
  {
    id: "p4",
    name: "Elias",
    rank: 4,
    points: 31.25,
    exact_hits: 2,
    form_points: 8,
    avatar_url: "",
    movement: 0
  },
  {
    id: "p5",
    name: "Silvia",
    rank: 5,
    points: 29.5,
    exact_hits: 4,
    form_points: 9.5,
    avatar_url: "",
    movement: 3
  }
];

export const mockMatches = [
  {
    id: "m1",
    round: "Group A",
    kickoff_at: "2028-06-09T21:00:00+02:00",
    home_team: "England",
    away_team: "Italia",
    home_tier: 1,
    away_tier: 1,
    user_home_tip: 2,
    user_away_tip: 1,
    max_points: 5
  },
  {
    id: "m2",
    round: "Group B",
    kickoff_at: "2028-06-10T18:00:00+02:00",
    home_team: "Norge",
    away_team: "Nederland",
    home_tier: 2,
    away_tier: 1,
    user_home_tip: 1,
    user_away_tip: 1,
    max_points: 8
  },
  {
    id: "m3",
    round: "Group C",
    kickoff_at: "2028-06-10T21:00:00+02:00",
    home_team: "Spania",
    away_team: "Tyrkia",
    home_tier: 1,
    away_tier: 3,
    user_home_tip: null,
    user_away_tip: null,
    max_points: 4
  },
  {
    id: "m4",
    round: "Group D",
    kickoff_at: "2028-06-11T18:00:00+02:00",
    home_team: "Danmark",
    away_team: "Belgia",
    home_tier: 2,
    away_tier: 2,
    user_home_tip: 1,
    user_away_tip: 2,
    max_points: 6
  }
];

export const mockNews = [
  {
    id: "n1",
    type: "drama",
    tag: "Folkets tips",
    icon: "🐑",
    title: "Flokken har bestemt seg",
    body: "71 % går for Spania-seier mot Tyrkia."
  },
  {
    id: "n2",
    type: "bonus",
    tag: "Road to Glory",
    icon: "🧨",
    title: "Argentina er folkets RTG-favoritt",
    body: "Nesten halvparten av spillerne har investert minst tre poeng."
  },
  {
    id: "n3",
    type: "stat",
    tag: "Form",
    icon: "🔥",
    title: "Gaby kommer raskest",
    body: "13,25 poeng på de siste fem kampene."
  }
];

export const mockCommunity = [
  {
    id: "c1",
    home_team: "England",
    away_team: "Italia",
    home_pct: 47,
    draw_pct: 28,
    away_pct: 25,
    common_score: "2–1"
  },
  {
    id: "c2",
    home_team: "Norge",
    away_team: "Nederland",
    home_pct: 31,
    draw_pct: 34,
    away_pct: 35,
    common_score: "1–1"
  }
];

export const mockProfile = {
  id: "p1",
  name: "Benjamin Barrios",
  overall: 91,
  rank: 1,
  points: 42.75,
  accuracy: 82,
  form: 95,
  underdogs: 88,
  titles: 2,
  exact_hits: 5,
  achievements: [
    { icon: "🎯", name: "Fulltreffer", description: "5 eksakte resultater" },
    { icon: "🧨", name: "Gærning", description: "Treff på tier 4-outsider" },
    { icon: "🏆", name: "Mester", description: "2 tidligere titler" }
  ],
  history: [
    { tournament: "VM 2026", rank: 2, points: 147.25 },
    { tournament: "EM 2024", rank: 5, points: 98 },
    { tournament: "VM 2022", rank: 1, points: 121.5 }
  ]
};
