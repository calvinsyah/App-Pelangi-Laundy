import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

export const useDashboardMetrics = (periode: string) => {
  return useQuery({
    queryKey: ['dashboard_metrics', periode],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_periode: periode
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });
};
