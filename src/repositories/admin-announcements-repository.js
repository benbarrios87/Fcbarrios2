import { supabase } from "../services/supabase-client.js";

export async function getAdminAnnouncements(tournamentId) {
  const { data, error } = await supabase.rpc("get_admin_announcements", {
    target_tournament_id: tournamentId
  });
  if (error) throw new Error(`Kunne ikke hente nyhetene: ${error.message}`);
  return data ?? [];
}

export async function saveAnnouncement({
  tournamentId,
  announcementId = null,
  title,
  body,
  icon = "",
  category = "news",
  isPublished = false
}) {
  const { data, error } = await supabase.rpc("save_announcement", {
    target_tournament_id: tournamentId,
    target_announcement_id: announcementId,
    announcement_title: title,
    announcement_body: body,
    announcement_icon: icon,
    announcement_category: category,
    announcement_is_published: isPublished
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAnnouncement(announcementId) {
  const { error } = await supabase.rpc("delete_announcement", {
    target_announcement_id: announcementId
  });
  if (error) throw new Error(error.message);
}
