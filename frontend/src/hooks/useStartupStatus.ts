import { useQuery } from '@tanstack/react-query';
import { getStartupStatus } from '../stellar';
import { StartupData } from '../types';

export const useStartupStatus = (founderAddress: string | null) => {
  return useQuery<StartupData | null>({
    queryKey: ['startupStatus', founderAddress],
    queryFn: () => founderAddress ? getStartupStatus(founderAddress) : null,
    enabled: !!founderAddress,
    refetchInterval: 10000,
    staleTime: 5000,
  });
};
