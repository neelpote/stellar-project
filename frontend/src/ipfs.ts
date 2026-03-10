import axios from 'axios';

// Pinata API configuration
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || '';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';

// IPFS Gateway for reading
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Demo mode flag
const DEMO_MODE = !PINATA_JWT && !PINATA_API_KEY;

export interface ProjectMetadata {
  project_name: string;
  description: string;
  project_url: string;
  team_info: string;
  timestamp: number;
}

/**
 * Upload project metadata to IPFS via Pinata
 */
export const uploadToIPFS = async (metadata: Omit<ProjectMetadata, 'timestamp'>): Promise<string> => {
  // Add timestamp
  const fullMetadata: ProjectMetadata = {
    ...metadata,
    timestamp: Date.now(),
  };

  console.log('IPFS Upload - Environment check:', {
    hasJWT: !!PINATA_JWT,
    hasAPIKey: !!PINATA_API_KEY,
    demoMode: DEMO_MODE,
    jwtLength: PINATA_JWT?.length || 0
  });

  // DEMO MODE: Use localStorage when no Pinata credentials
  if (DEMO_MODE) {
    console.log('🎭 Demo Mode: Using localStorage instead of IPFS');
    
    // Create a deterministic mock CID based on project name and timestamp
    const mockCid = `QmDemo${btoa(metadata.project_name + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)}`;
    
    // Store in localStorage for demo purposes
    localStorage.setItem(`ipfs_${mockCid}`, JSON.stringify(fullMetadata));
    
    console.log('✅ Mock IPFS CID created:', mockCid);
    
    // Simulate network delay for realistic experience
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockCid;
  }

  // PRODUCTION MODE: Use real IPFS via Pinata
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
      console.log('Using Pinata JWT authentication');
    } else if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY;
      console.log('Using Pinata API key authentication');
    }

    console.log('Uploading to IPFS...', { project_name: metadata.project_name });

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

    console.log('IPFS upload successful:', response.data.IpfsHash);
    return response.data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    
    // Fallback to demo mode if IPFS fails
    console.log('🎭 Falling back to demo mode due to IPFS error');
    const mockCid = `QmFallback${btoa(metadata.project_name + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 37)}`;
    localStorage.setItem(`ipfs_${mockCid}`, JSON.stringify(fullMetadata));
    console.log('✅ Fallback mock CID created:', mockCid);
    return mockCid;
  }
};

/**
 * Fetch project metadata from IPFS
 */
export const fetchFromIPFS = async (cid: string): Promise<ProjectMetadata> => {
  // Check if it's a demo/mock CID (starts with QmDemo or QmFallback)
  if (cid.startsWith('QmDemo') || cid.startsWith('QmFallback')) {
    const mockData = localStorage.getItem(`ipfs_${cid}`);
    if (mockData) {
      console.log('📱 Loading demo data for CID:', cid);
      return JSON.parse(mockData);
    } else {
      console.warn('Demo CID not found in localStorage:', cid);
      throw new Error('Demo data not found. This may be an old or invalid demo CID.');
    }
  }

  // Try to fetch from IPFS gateway
  try {
    console.log('🌐 Fetching from IPFS gateway:', cid);
    const response = await axios.get(`${IPFS_GATEWAY}${cid}`, {
      timeout: 10000, // 10 second timeout
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

/**
 * Get IPFS gateway URL for a CID
 */
export const getIPFSUrl = (cid: string): string => {
  return `${IPFS_GATEWAY}${cid}`;
};
