import { supabase, snakeToCamel } from '../lib/supabase';
import type { Database } from '../types/database';

type Category = Database['public']['Enums']['mro_service_category'];

export interface MroFilter {
  category?: Category;
  aircraft?: string;     // matches against aircraft_types[] via ANY
  location?: string;
  myServices?: boolean;  // AMO viewing their own listings (incl. inactive)
}

export async function listMroServices(opts: MroFilter = {}) {
  let q = supabase
    .from('mro_service')
    .select('*, mro:mro_id(name, email)')
    .order('created_at', { ascending: false });

  if (opts.category)  q = q.eq('category', opts.category);
  if (opts.location)  q = q.ilike('location', `%${opts.location}%`);
  if (opts.aircraft)  q = q.contains('aircraft_types', [opts.aircraft]);
  if (opts.myServices) {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) q = q.eq('mro_id', u.user.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return snakeToCamel(data);
}

export async function createMroService(payload: {
  name: string;
  category: Category;
  description?: string | null;
  aircraftTypes?: string[];
  location: string;
  leadTimeDays?: number | null;
  priceFrom?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('mro_service')
    .insert({
      mro_id: u.user.id,
      name: payload.name,
      category: payload.category,
      description: payload.description || null,
      aircraft_types: payload.aircraftTypes ?? [],
      location: payload.location,
      lead_time_days: payload.leadTimeDays ?? null,
      price_from: payload.priceFrom || null,
      status: 'pending',                    // admin verifies AMO before listing goes live
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel(data);
}

export async function requestMroQuote(serviceId: string, message?: string) {
  const { data, error } = await supabase.rpc('request_mro_quote', {
    p_service_id: serviceId,
    p_message: message || null,
  });
  if (error) throw error;
  return snakeToCamel(data);
}
