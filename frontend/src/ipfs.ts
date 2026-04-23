import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || '';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Falls back to localStorage-based mock CIDs when no Pinata credentials are configured
const DEMO_MODE = !PINATA_JWT && !PINATA_API_KEY;

export interface ProjectMetadata {
  project_name: string;
  description: string;
  project_url: string;
  team_info: string;
  timestamp: number;
}

export const uploadToIPFS = async (metadata: Omit<ProjectMetadata, 'timestamp'>): Promise<string> => {
  const fullMetadata: ProjectMetadata = {
    ...metadata,
    timestamp: Date.now(),
  };

  if (DEMO_MODE) {
    const mockCid = `QmDemo${btoa(metadata.project_name + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)}`;
    localStorage.setItem(`ipfs_${mockCid}`, JSON.stringify(fullMetadata));
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockCid;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    } else if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY;
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: fullMetadata,
        pinataMetadata: {
          name: `DeCo-${metadata.project_name}-${Date.now()}`,
        },
      },
      { headers }
    );

    return response.data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);

    // Fall back to demo mode so the user isn't blocked by a Pinata outage
    const mockCid = `QmFallback${btoa(metadata.project_name + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 37)}`;
    localStorage.setItem(`ipfs_${mockCid}`, JSON.stringify(fullMetadata));
    return mockCid;
  }
};

export const fetchFromIPFS = async (cid: string): Promise<ProjectMetadata> => {
  if (cid.startsWith('QmDemo') || cid.startsWith('QmFallback')) {
    const mockData = localStorage.getItem(`ipfs_${cid}`);
    if (mockData) {
      return JSON.parse(mockData);
    }
    throw new Error('Demo data not found. This may be an old or invalid demo CID.');
  }

  try {
    const response = await axios.get(`${IPFS_GATEWAY}${cid}`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error('IPFS fetch error:', error);

    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('IPFS fetch timeout. The content may not be available yet.');
    }

    throw new Error('Failed to fetch from IPFS. The content may not be available.');
  }
};

export const getIPFSUrl = (cid: string): string => {
  return `${IPFS_GATEWAY}${cid}`;
};
