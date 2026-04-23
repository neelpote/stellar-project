import { useQuery } from '@tanstack/react-query';
import { getAdmin } from '../stellar';

export const useAdmin = () => {
  return useQuery<string | null>({
    queryKey: ['admin'],
    queryFn: getAdmin,
    // Admin address changes rarely, so a long stale time is fine
    staleTime: 60000,
    refetchInterval: 30000,
  });
};
