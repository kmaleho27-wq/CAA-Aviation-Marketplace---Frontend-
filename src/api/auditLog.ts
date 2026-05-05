import { supabase, snakeToCamel } from '../lib/supabase';

export interface AuditEvent {
  // Note: server returns event_id / event_seq / event_type to avoid
  // OUT-parameter ambiguity in the underlying RPC (migration 0022b).
  // snakeToCamel converts to eventId / eventSeq / eventType for callers.
  eventId: string;
  eventSeq: number;
  eventType: string;
  subjectId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  hash: string;
  prevHash: string | null;
  createdAt: string;
}

export interface ChainSegmentProof {
  valid: boolean;
  rowsChecked: number;
  brokenAtSeq: number | null;
  reason: string | null;
}

/** Audit events relevant to the calling user (admin sees all). Pulls
 *  the events that touch the operator's personnel, transactions, or
 *  MRO quotes via payload-keyed lookups. Server-side via RPC so RLS
 *  plus payload-aware filtering happen in one round-trip. */
export async function getMyAuditEvents(opts: { fromSeq?: number; limit?: number } = {}) {
  const { data, error } = await supabase.rpc('get_my_audit_events', {
    p_from_seq: opts.fromSeq ?? 0,
    p_limit:    opts.limit ?? 1000,
  });
  if (error) throw error;
  return snakeToCamel(data) as AuditEvent[];
}

/** Cryptographic proof that a contiguous range of audit_event rows
 *  forms a valid hash chain. Pair with the visible event list above
 *  to give a SACAA inspector / insurance auditor a self-verifiable
 *  bundle. */
export async function verifyChainSegment(fromSeq: number, toSeq: number) {
  const { data, error } = await supabase.rpc('verify_chain_segment', {
    p_from_seq: fromSeq, p_to_seq: toSeq,
  });
  if (error) throw error;
  return snakeToCamel(data?.[0] ?? {}) as ChainSegmentProof;
}
