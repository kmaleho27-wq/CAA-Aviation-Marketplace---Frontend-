import { supabase, snakeToCamel } from '../lib/supabase';

export async function submitSupportTicket(payload: {
  email: string;
  subject: string;
  body: string;
}) {
  const { data, error } = await supabase.rpc('submit_support_ticket', {
    p_email: payload.email,
    p_subject: payload.subject,
    p_body: payload.body,
  });
  if (error) throw error;
  return { ticketId: data as string };
}

export async function listMySupportTickets() {
  const { data, error } = await supabase
    .from('support_ticket')
    .select('id, subject, body, status, created_at, resolved_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

export async function listAllSupportTickets() {
  const { data, error } = await supabase
    .from('support_ticket')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}
