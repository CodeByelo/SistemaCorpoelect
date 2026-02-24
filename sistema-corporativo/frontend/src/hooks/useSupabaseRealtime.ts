import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useOrgStore, type OrgState } from '../store/useOrgStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const useSupabaseRealtime = (table: string, filter?: string) => {
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
  const currentOrg = useOrgStore((state: OrgState) => state.currentOrg);

  useEffect(() => {
    if (!currentOrg) return;

    setStatus('connecting');

    const channel = supabase
      .channel(`realtime:${table}:${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter || `tenant_id=eq.${currentOrg.id}`,
        },
        (payload: any) => {
          console.log('Change received!', payload);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setStatus('synced');
        if (status === 'CHANNEL_ERROR') setStatus('error');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, currentOrg]);

  return { data, status };
};
