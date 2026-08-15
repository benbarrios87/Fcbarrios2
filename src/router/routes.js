import { HomePage } from "../pages/home/home-page.js";
import { TipsPage } from "../pages/tips/tips-page.js";
import { BonusPage } from "../pages/bonus/bonus-page.js";
import { LeaderboardPage } from "../pages/leaderboard/leaderboard-page.js";
import { ProfilePage } from "../pages/profile/profile-page.js";
import { EditProfilePage } from "../pages/profile/edit-profile-page.js";
import { StatsPage } from "../pages/stats/stats-page.js";
import { AdminPage } from "../pages/admin/admin-page.js";
import { ResultsPage } from "../pages/admin/results-page.js";
import { ScoreModelPage } from "../pages/admin/score-model-page.js";
import { BonusSettingsPage } from "../pages/admin/bonus-settings-page.js";
import { PaymentsPage } from "../pages/admin/payments-page.js";
import { PrizesPage } from "../pages/admin/prizes-page.js";
import { TournamentPage } from "../pages/admin/tournament-page.js";
import { TeamsPage } from "../pages/admin/teams-page.js";
import { MembersPage } from "../pages/admin/members-page.js";
import { AnnouncementsPage } from "../pages/admin/announcements-page.js";
import { KnowYourClubAdminPage } from "../pages/admin/know-your-club-admin-page.js";
import { HistoryPage } from "../pages/history/history-page.js";
import { ClubSelectPage } from "../pages/club-select/club-select-page.js";
import { ClubTipsPage } from "../pages/club-tips/club-tips-page.js";
import { ClubLeaderboardPage } from "../pages/club-leaderboard/club-leaderboard-page.js";
import { LoginPage } from "../pages/login/login-page.js";
import { ResetPasswordPage } from "../pages/login/reset-password-page.js";
import { AuthCallbackPage } from "../pages/auth-callback/auth-callback-page.js";

export const routes={
  "/":HomePage,
  "/login":LoginPage,
  "/reset-password":ResetPasswordPage,
  "/auth/callback":AuthCallbackPage,
  "/tips":TipsPage,
  "/bonuses":BonusPage,
  "/leaderboard":LeaderboardPage,
  "/profile":ProfilePage,
  "/profile/edit":EditProfilePage,
  "/stats":StatsPage,
  "/history":HistoryPage,
  "/know-your-club":ClubSelectPage,
  "/know-your-club/tips":ClubTipsPage,
  "/know-your-club/leaderboard":ClubLeaderboardPage,
  "/admin":AdminPage,
  "/admin/results":ResultsPage,
  "/admin/scoring":ScoreModelPage,
  "/admin/bonuses":BonusSettingsPage,
  "/admin/payments":PaymentsPage,
  "/admin/prizes":PrizesPage,
  "/admin/tournament":TournamentPage,
  "/admin/teams":TeamsPage,
  "/admin/members":MembersPage,
  "/admin/announcements":AnnouncementsPage,
  "/admin/know-your-club":KnowYourClubAdminPage
};
