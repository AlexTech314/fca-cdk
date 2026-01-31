import type {
  Organization,
  User,
  Lead,
  Campaign,
  CampaignRun,
  CampaignWithStats,
  TimeSeriesData,
  DistributionData,
} from '@/types';

// ===========================================
// Helper Functions
// ===========================================

function generatePlaceId(): string {
  return 'ChIJ' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRating(): number {
  return Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
}

function randomScore(): number | null {
  return Math.random() > 0.3 ? Math.floor(Math.random() * 40) + 60 : null;
}

// ===========================================
// Static Data
// ===========================================

const businessTypes = ['Plumber', 'HVAC', 'Electrician', 'Roofer', 'Landscaper', 'General Contractor'];

const statesData: Record<string, string[]> = {
  'CO': ['Denver', 'Boulder', 'Colorado Springs', 'Fort Collins', 'Aurora'],
  'TX': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  'AZ': ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Tempe'],
  'NV': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas'],
  'UT': ['Salt Lake City', 'Provo', 'West Valley City', 'Ogden'],
};

const businessPrefixes = [
  'Pro', 'Elite', 'Premier', 'Quality', 'Reliable', 'Expert', 'Advanced', 
  'Superior', 'Trusted', 'Professional', 'Master', 'First Choice', 'All-Star'
];

const businessSuffixes = [
  'Services', 'Solutions', 'Pros', 'Experts', 'Co', 'LLC', 'Inc', 'Group', 'Team'
];

// ===========================================
// Organization
// ===========================================

export const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Flatirons Capital',
  usageLimitLeads: 10000,
  usageLimitExports: 100,
  createdAt: '2024-01-01T00:00:00.000Z',
};

// ===========================================
// Users
// ===========================================

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@flatironscapital.com',
    name: 'John Smith',
    cognitoSub: 'cognito-sub-1',
    organizationId: 'org-1',
    role: 'admin',
    invitedAt: '2024-01-01T00:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'jane@flatironscapital.com',
    name: 'Jane Doe',
    cognitoSub: 'cognito-sub-2',
    organizationId: 'org-1',
    role: 'readwrite',
    invitedAt: '2024-01-15T00:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'user-3',
    email: 'bob@flatironscapital.com',
    name: 'Bob Wilson',
    cognitoSub: 'cognito-sub-3',
    organizationId: 'org-1',
    role: 'readwrite',
    invitedAt: '2024-02-01T00:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
  },
  {
    id: 'user-4',
    email: 'sarah@flatironscapital.com',
    name: 'Sarah Johnson',
    cognitoSub: 'cognito-sub-4',
    organizationId: 'org-1',
    role: 'readonly',
    invitedAt: '2024-03-01T00:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
  },
];

// ===========================================
// Campaigns
// ===========================================

export const mockCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    organizationId: 'org-1',
    name: 'Colorado Plumbers',
    description: 'Targeting plumbing businesses across Colorado metro areas',
    queries: [
      'plumbers in Denver CO',
      'plumbers in Boulder CO',
      'plumbers in Colorado Springs CO',
      'plumbers in Fort Collins CO',
      'plumbing contractors Denver',
      'emergency plumber Denver CO',
    ],
    createdById: 'user-1',
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  },
  {
    id: 'campaign-2',
    organizationId: 'org-1',
    name: 'Texas HVAC',
    description: 'HVAC contractors in major Texas cities',
    queries: [
      'HVAC contractors Houston TX',
      'HVAC contractors Dallas TX',
      'HVAC contractors Austin TX',
      'air conditioning repair Houston',
      'heating and cooling Dallas TX',
    ],
    createdById: 'user-1',
    createdAt: '2024-06-15T00:00:00.000Z',
    updatedAt: '2024-06-15T00:00:00.000Z',
  },
  {
    id: 'campaign-3',
    organizationId: 'org-1',
    name: 'Arizona Electricians',
    description: 'Electrical contractors in Arizona',
    queries: [
      'electricians Phoenix AZ',
      'electricians Tucson AZ',
      'electricians Scottsdale AZ',
      'electrical contractors Mesa AZ',
    ],
    createdById: 'user-2',
    createdAt: '2024-07-01T00:00:00.000Z',
    updatedAt: '2024-07-01T00:00:00.000Z',
  },
  {
    id: 'campaign-4',
    organizationId: 'org-1',
    name: 'Southwest Roofers',
    description: 'Roofing companies across the Southwest',
    queries: [
      'roofers Las Vegas NV',
      'roofing contractors Phoenix AZ',
      'roofers Salt Lake City UT',
      'commercial roofing Denver CO',
    ],
    createdById: 'user-2',
    createdAt: '2024-07-15T00:00:00.000Z',
    updatedAt: '2024-07-15T00:00:00.000Z',
  },
  {
    id: 'campaign-5',
    organizationId: 'org-1',
    name: 'General Contractors CO',
    description: 'General contractors in Colorado',
    queries: [
      'general contractors Denver CO',
      'home remodeling Denver',
      'construction companies Boulder CO',
    ],
    createdById: 'user-1',
    createdAt: '2024-08-01T00:00:00.000Z',
    updatedAt: '2024-08-01T00:00:00.000Z',
  },
  {
    id: 'campaign-6',
    organizationId: 'org-1',
    name: 'Landscapers Multi-State',
    description: 'Landscaping businesses across multiple states',
    queries: [
      'landscapers Denver CO',
      'landscaping companies Austin TX',
      'lawn care Phoenix AZ',
      'landscape design Salt Lake City',
    ],
    createdById: 'user-3',
    createdAt: '2024-08-15T00:00:00.000Z',
    updatedAt: '2024-08-15T00:00:00.000Z',
  },
];

// ===========================================
// Campaign Runs
// ===========================================

export const mockCampaignRuns: CampaignRun[] = [
  // Campaign 1 runs
  {
    id: 'run-1',
    campaignId: 'campaign-1',
    organizationId: 'org-1',
    startedById: 'user-1',
    status: 'completed',
    startedAt: '2024-12-01T10:00:00.000Z',
    completedAt: '2024-12-01T10:15:00.000Z',
    queriesTotal: 6,
    queriesExecuted: 6,
    leadsFound: 142,
    duplicatesSkipped: 12,
    errors: 0,
    errorMessages: [],
  },
  {
    id: 'run-2',
    campaignId: 'campaign-1',
    organizationId: 'org-1',
    startedById: 'user-1',
    status: 'completed',
    startedAt: '2024-12-15T14:00:00.000Z',
    completedAt: '2024-12-15T14:12:00.000Z',
    queriesTotal: 6,
    queriesExecuted: 6,
    leadsFound: 87,
    duplicatesSkipped: 45,
    errors: 0,
    errorMessages: [],
  },
  {
    id: 'run-3',
    campaignId: 'campaign-1',
    organizationId: 'org-1',
    startedById: 'user-2',
    status: 'completed',
    startedAt: '2025-01-10T09:00:00.000Z',
    completedAt: '2025-01-10T09:18:00.000Z',
    queriesTotal: 6,
    queriesExecuted: 6,
    leadsFound: 63,
    duplicatesSkipped: 78,
    errors: 0,
    errorMessages: [],
  },
  // Campaign 2 runs
  {
    id: 'run-4',
    campaignId: 'campaign-2',
    organizationId: 'org-1',
    startedById: 'user-1',
    status: 'completed',
    startedAt: '2024-12-05T11:00:00.000Z',
    completedAt: '2024-12-05T11:20:00.000Z',
    queriesTotal: 5,
    queriesExecuted: 5,
    leadsFound: 198,
    duplicatesSkipped: 8,
    errors: 0,
    errorMessages: [],
  },
  {
    id: 'run-5',
    campaignId: 'campaign-2',
    organizationId: 'org-1',
    startedById: 'user-2',
    status: 'completed',
    startedAt: '2025-01-05T15:30:00.000Z',
    completedAt: '2025-01-05T15:45:00.000Z',
    queriesTotal: 5,
    queriesExecuted: 5,
    leadsFound: 124,
    duplicatesSkipped: 67,
    errors: 0,
    errorMessages: [],
  },
  // Campaign 3 runs
  {
    id: 'run-6',
    campaignId: 'campaign-3',
    organizationId: 'org-1',
    startedById: 'user-2',
    status: 'completed',
    startedAt: '2024-12-10T08:00:00.000Z',
    completedAt: '2024-12-10T08:10:00.000Z',
    queriesTotal: 4,
    queriesExecuted: 4,
    leadsFound: 156,
    duplicatesSkipped: 5,
    errors: 0,
    errorMessages: [],
  },
  {
    id: 'run-7',
    campaignId: 'campaign-3',
    organizationId: 'org-1',
    startedById: 'user-1',
    status: 'failed',
    startedAt: '2025-01-15T10:00:00.000Z',
    completedAt: '2025-01-15T10:02:00.000Z',
    queriesTotal: 4,
    queriesExecuted: 1,
    leadsFound: 0,
    duplicatesSkipped: 0,
    errors: 3,
    errorMessages: ['API rate limit exceeded', 'Request timeout', 'Request timeout'],
  },
  // Campaign 4 runs
  {
    id: 'run-8',
    campaignId: 'campaign-4',
    organizationId: 'org-1',
    startedById: 'user-2',
    status: 'completed',
    startedAt: '2024-12-20T13:00:00.000Z',
    completedAt: '2024-12-20T13:08:00.000Z',
    queriesTotal: 4,
    queriesExecuted: 4,
    leadsFound: 112,
    duplicatesSkipped: 3,
    errors: 0,
    errorMessages: [],
  },
  {
    id: 'run-9',
    campaignId: 'campaign-4',
    organizationId: 'org-1',
    startedById: 'user-3',
    status: 'completed',
    startedAt: '2025-01-20T16:00:00.000Z',
    completedAt: '2025-01-20T16:12:00.000Z',
    queriesTotal: 4,
    queriesExecuted: 4,
    leadsFound: 89,
    duplicatesSkipped: 34,
    errors: 0,
    errorMessages: [],
  },
  // Campaign 5 runs
  {
    id: 'run-10',
    campaignId: 'campaign-5',
    organizationId: 'org-1',
    startedById: 'user-1',
    status: 'completed',
    startedAt: '2025-01-08T09:30:00.000Z',
    completedAt: '2025-01-08T09:38:00.000Z',
    queriesTotal: 3,
    queriesExecuted: 3,
    leadsFound: 78,
    duplicatesSkipped: 2,
    errors: 0,
    errorMessages: [],
  },
  // Campaign 6 runs
  {
    id: 'run-11',
    campaignId: 'campaign-6',
    organizationId: 'org-1',
    startedById: 'user-3',
    status: 'completed',
    startedAt: '2025-01-25T11:00:00.000Z',
    completedAt: '2025-01-25T11:10:00.000Z',
    queriesTotal: 4,
    queriesExecuted: 4,
    leadsFound: 134,
    duplicatesSkipped: 6,
    errors: 0,
    errorMessages: [],
  },
  {
    id: 'run-12',
    campaignId: 'campaign-6',
    organizationId: 'org-1',
    startedById: 'user-2',
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    queriesTotal: 4,
    queriesExecuted: 2,
    leadsFound: 45,
    duplicatesSkipped: 3,
    errors: 0,
    errorMessages: [],
  },
];

// ===========================================
// Leads
// ===========================================

function generateLeads(): Lead[] {
  const leads: Lead[] = [];
  const states = Object.keys(statesData);
  
  for (let i = 0; i < 65; i++) {
    const state = randomChoice(states);
    const city = randomChoice(statesData[state]);
    const businessType = randomChoice(businessTypes);
    const prefix = randomChoice(businessPrefixes);
    const suffix = randomChoice(businessSuffixes);
    const campaign = randomChoice(mockCampaigns);
    const campaignRuns = mockCampaignRuns.filter(r => r.campaignId === campaign.id && r.status === 'completed');
    const campaignRun = campaignRuns.length > 0 ? randomChoice(campaignRuns) : null;
    
    const score = randomScore();
    const qualifiedAt = score !== null ? randomDate(new Date('2025-01-01'), new Date()) : null;
    
    leads.push({
      id: `lead-${i + 1}`,
      placeId: generatePlaceId(),
      organizationId: 'org-1',
      campaignId: campaign.id,
      campaignRunId: campaignRun?.id || null,
      name: `${prefix} ${businessType} ${suffix}`,
      address: `${Math.floor(Math.random() * 9000) + 1000} ${randomChoice(['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm'])} ${randomChoice(['St', 'Ave', 'Blvd', 'Dr', 'Way'])}`,
      city,
      state,
      zipCode: String(Math.floor(Math.random() * 90000) + 10000),
      phone: Math.random() > 0.15 ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` : null,
      website: Math.random() > 0.2 ? `https://www.${prefix.toLowerCase()}${businessType.toLowerCase().replace(' ', '')}.com` : null,
      rating: randomRating(),
      reviewCount: Math.floor(Math.random() * 200) + 5,
      priceLevel: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : null,
      businessType,
      qualificationScore: score,
      qualificationNotes: score !== null ? generateQualificationNotes(score) : null,
      qualifiedAt,
      source: 'google_maps',
      createdAt: randomDate(new Date('2024-06-01'), new Date()),
      updatedAt: randomDate(new Date('2024-06-01'), new Date()),
    });
  }
  
  return leads;
}

function generateQualificationNotes(score: number): string {
  if (score >= 80) {
    return '• Strong online presence with professional website\n• High review count and excellent ratings\n• Established business with 5+ years operation\n• Good geographic coverage';
  } else if (score >= 60) {
    return '• Moderate online presence\n• Decent reviews and ratings\n• Growing business with potential\n• Limited service area';
  } else {
    return '• Limited online presence\n• Few reviews\n• New or small operation\n• May need more research';
  }
}

export const mockLeads: Lead[] = generateLeads();

// ===========================================
// Computed Data
// ===========================================

export const mockCampaignsWithStats: CampaignWithStats[] = mockCampaigns.map(campaign => {
  const runs = mockCampaignRuns.filter(r => r.campaignId === campaign.id);
  const completedRuns = runs.filter(r => r.status === 'completed');
  const totalLeads = completedRuns.reduce((sum, r) => sum + r.leadsFound, 0);
  const lastRun = runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  
  return {
    ...campaign,
    totalLeads,
    lastRunAt: lastRun?.startedAt || null,
    runsCount: runs.length,
  };
});

// ===========================================
// Dashboard Data
// ===========================================

export function generateLeadsOverTime(days: number = 7): TimeSeriesData[] {
  const data: TimeSeriesData[] = [];
  const now = new Date();
  
  for (let d = days - 1; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - d);
      timestamp.setHours(h, 0, 0, 0);
      
      // Generate some realistic-looking data with variation
      const baseValue = 10;
      const hourFactor = h >= 9 && h <= 17 ? 2 : 0.5; // Higher during business hours
      const randomFactor = 0.5 + Math.random();
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.floor(baseValue * hourFactor * randomFactor),
      });
    }
  }
  
  return data;
}

export function generateCampaignsOverTime(days: number = 7): TimeSeriesData[] {
  const data: TimeSeriesData[] = [];
  const now = new Date();
  
  for (let d = days - 1; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - d);
      timestamp.setHours(h, 0, 0, 0);
      
      // Campaigns run less frequently
      const value = Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0;
      
      data.push({
        timestamp: timestamp.toISOString(),
        value,
      });
    }
  }
  
  return data;
}

export function getBusinessTypeDistribution(): DistributionData[] {
  const counts: Record<string, number> = {};
  
  mockLeads.forEach(lead => {
    if (lead.businessType) {
      counts[lead.businessType] = (counts[lead.businessType] || 0) + 1;
    }
  });
  
  const total = mockLeads.length;
  
  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

export function getLocationDistribution(): DistributionData[] {
  const counts: Record<string, number> = {};
  
  mockLeads.forEach(lead => {
    if (lead.state) {
      counts[lead.state] = (counts[lead.state] || 0) + 1;
    }
  });
  
  const total = mockLeads.length;
  
  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

// Current user (admin)
export const mockCurrentUser = mockUsers[0];
