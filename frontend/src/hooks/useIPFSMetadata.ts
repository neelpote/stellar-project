import { useQuery } from '@tanstack/react-query';
import { fetchFromIPFS, ProjectMetadata } from '../ipfs';

export const useIPFSMetadata = (cid: string | undefined) => {
  return useQuery<ProjectMetadata | null>({
    queryKey: ['ipfsMetadata', cid],
    queryFn: async () => {
      if (!cid) return null;
      try {
        const result = await fetchFromIPFS(cid);
        return result;
      } catch (error) {
        console.error('Failed to fetch IPFS metadata:', error);
        // Return null so the UI shows a fallback instead of spinning forever
        return null;
      }
    },
    enabled: !!cid,
    staleTime: 60000,
    retry: 2,
    retryDelay: 2000,
  });
};
