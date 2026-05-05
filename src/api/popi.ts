import { supabase } from '../lib/supabase';
import { logout } from '../lib/auth';

/** Right-to-export: returns a JSON blob of everything the user owns. */
export async function getMyDataExport() {
  const { data, error } = await supabase.rpc('get_my_data_export');
  if (error) throw error;
  return data;
}

/** Trigger a download of the user's data as JSON. */
export async function downloadMyDataExport() {
  const data = await getMyDataExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ymd = new Date().toISOString().slice(0, 10);
  a.download = `naluka-data-export-${ymd}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Right-to-delete: tombstones the user's profile + personnel rows.
 * Personnel data retained 90 days for transaction-counterparty
 * traceability, then a cron purges. Returns the purge_after date.
 * After this resolves, the caller is signed out.
 */
export async function requestAccountDeletion() {
  const { data, error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
  await supabase.auth.signOut();
  logout();   // mirrors local storage clear
  return data as { deleted_at: string; purge_after: string; note: string };
}
