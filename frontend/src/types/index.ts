export interface ServiceItem {
  id: string;
  index: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
  features: string[];
  equipment: string[]; // repurposed as techStack / keyCapabilities
  targetAthletes: string; // repurposed as targetStakeholders
}

export interface PartnerLogo {
  id: string;
  name: string;
  category?: string;
  badgeType: 'crest' | 'text' | 'shield';
  symbol: string;
}

export interface StatMetric {
  id: string;
  number: string;
  label: string;
  subtext?: string;
  tags?: string[];
  listItems?: string[];
}

export interface ProcessStep {
  step: string;
  index: string;
  title: string;
  description: string;
  highlight: string;
}

export interface LabArticle {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  image: string;
  category: string;
  readTime: string;
}
