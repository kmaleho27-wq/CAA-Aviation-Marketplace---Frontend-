import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * List notifications for the current user. RLS allows:
 *   - own (user_id = auth.uid())
 *   - broadcasts (user_id IS NULL)
 *   - admin (sees everything)
 */
export async function listNotifications() {
  const { data, error } = await supabase
    .from('notification')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Mark all of the current user's notifications as read. Direct UPDATE; RLS
 * already constrains it to user_id = auth.uid() (see notification_update_self).
 */
export async function markAllRead() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('notification')
    .update({ unread: false })
    .eq('user_id', user.user.id)
    .eq('unread', true)
    .select('id');
  if (error) throw error;
  return { updated: data?.length ?? 0 };
}
