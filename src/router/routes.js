import { HomePage } from "../pages/home/home-page.js";
import { TipsPage } from "../pages/tips/tips-page.js";
import { LeaderboardPage } from "../pages/leaderboard/leaderboard-page.js";
import { ProfilePage } from "../pages/profile/profile-page.js";
import { StatsPage } from "../pages/stats/stats-page.js";
import { AdminPage } from "../pages/admin/admin-page.js";
import { HistoryPage } from "../pages/history/history-page.js";

export const routes = {
  "/": HomePage,
  "/tips": TipsPage,
  "/leaderboard": LeaderboardPage,
  "/profile": ProfilePage,
  "/stats": StatsPage,
  "/history": HistoryPage,
  "/admin": AdminPage
};
