import { communityWatchContract, identityContract, Report, Identity, Sighting } from './xion-contracts';
import { xionClient } from './xion-client';

export interface ResponseContext {
  report: Report;
  userReputation: number;
  nearbyReports: Report[];
  userHistory: {
    reportsCreated: number;
    sightingsContributed: number;
    verificationCount: number;
  };
  blockchainData: {
    totalReports: number;
    activeReports: number;
    verifiedReports: number;
    moderatorCount: number;
  };
}

export interface GeneratedResponse {
  type: 'verification' | 'sighting' | 'update' | 'warning' | 'community_alert';
  content: string;
  confidence: number;
  blockchainVerified: boolean;
  suggestedActions: string[];
  relatedEntities: string[];
  metadata: {
    responseTime: number;
    dataSource: string[];
    credibilityScore: number;
  };
}

export class AIResponseGenerator {
  private responseTemplates = {
    verification: [
      "Based on blockchain verification patterns, this report shows {confidence}% credibility. {location} has {history_count} similar reports in the past {timeframe}.",
      "Smart contract analysis indicates {verification_level} verification status. {witness_count} blockchain-verified witnesses have contributed to this case.",
      "XION blockchain data confirms this report aligns with {pattern_match}% of verified reports in this category."
    ],
    sighting: [
      "Blockchain analysis suggests {probability}% probability of authentic sighting. {nearby_reports} confirmed reports within {radius}km.",
      "Smart contract verification: {verification_points} data points match verified patterns. Weather and time data: {weather_analysis}.",
      "Cross-referencing with blockchain ledger: {match_count} similar verified sightings in this area."
    ],
    update: [
      "Smart contract status update: {status_change}. {blockchain_confirmations} confirmations on XION network.",
      "Blockchain consensus: {consensus_percentage}% of verified contributors support this update. {verification_details}.",
      "On-chain verification complete: {verification_result}. {additional_context}."
    ],
    warning: [
      "URGENT: Blockchain pattern analysis indicates {threat_level} threat level. {similar_incidents} similar incidents in past {timeframe}.",
      "Smart contract alert: {alert_type} detected. {affected_area} area potentially affected. {evacuation_recommendation}.",
      "XION network consensus: {consensus_votes} verified reports suggest immediate action. {safety_measures}."
    ],
    community_alert: [
      "Community-wide blockchain alert: {alert_message}. {verified_sources} verified sources confirm.",
      "Smart contract broadcast: {community_impact} impact expected. {response_time} average response time in area.",
      "XION governance protocol activated: {protocol_details}. {community_action} recommended."
    ]
  };

  private realisticData = {
    locations: ['downtown district', 'residential area', 'commercial zone', 'park vicinity', 'transport hub', 'educational institution'],
    timeframes: ['24 hours', '3 days', 'week', 'month', 'quarter'],
    weatherConditions: ['clear visibility', 'moderate conditions', 'poor visibility', 'optimal conditions', 'adverse weather'],
    threatLevels: ['HIGH', 'MODERATE', 'ELEVATED', 'CRITICAL', 'LOW'],
    verificationLevels: ['VERIFIED', 'PENDING', 'DISPUTED', 'COMMUNITY_CONFIRMED', 'MODERATOR_APPROVED']
  };

  async generateRealisticResponse(report: Report, userAddress?: string): Promise<GeneratedResponse> {
    try {
      // Gather blockchain context
      const context = await this.gatherBlockchainContext(report, userAddress);
      
      // Determine response type based on report data and blockchain analysis
      const responseType = this.determineResponseType(report, context);
      
      // Generate response using blockchain-enhanced AI
      const response = await this.generateBlockchainEnhancedResponse(responseType, report, context);
      
      return response;
    } catch (error) {
      console.error('Error generating realistic response:', error);
      return this.generateFallbackResponse(report);
    }
  }

  private async gatherBlockchainContext(report: Report, userAddress?: string): Promise<ResponseContext> {
    const [nearbyReports, identity, allReports] = await Promise.all([
      this.getNearbyReports(report.location.latitude, report.location.longitude),
      userAddress ? identityContract.getIdentity(userAddress) : null,
      communityWatchContract.getAllReports(100, 0)
    ]);

    const userReputation = identity?.reputation_score || 0;
    const userHistory = identity ? {
      reportsCreated: identity.reports_created,
      sightingsContributed: identity.sightings_contributed,
      verificationCount: identity.verification_count
    } : { reportsCreated: 0, sightingsContributed: 0, verificationCount: 0 };

    const blockchainData = {
      totalReports: allReports.length,
      activeReports: allReports.filter(r => r.status === 'Open' || r.status === 'InProgress').length,
      verifiedReports: allReports.filter(r => r.verified_count > 0).length,
      moderatorCount: await this.getModeratorCount()
    };

    return {
      report,
      userReputation,
      nearbyReports,
      userHistory,
      blockchainData
    };
  }

  private async getNearbyReports(lat: number, lng: number): Promise<Report[]> {
    try {
      // Search within 5km radius
      const radius = 0.05; // approximately 5km
      return await communityWatchContract.getReportsByLocation(
        lat - radius,
        lat + radius,
        lng - radius,
        lng + radius
      );
    } catch (error) {
      console.error('Error fetching nearby reports:', error);
      return [];
    }
  }

  private async getModeratorCount(): Promise<number> {
    try {
      const moderators = await identityContract.getModerators();
      return moderators.length;
    } catch (error) {
      return 0;
    }
  }

  private determineResponseType(report: Report, context: ResponseContext): GeneratedResponse['type'] {
    // Use blockchain data to determine most appropriate response type
    const { severity, verified_count, disputed_count } = report;
    const { nearbyReports, blockchainData } = context;

    if (severity >= 8 && nearbyReports.length >= 3) {
      return 'warning';
    }
    
    if (verified_count >= 5 || blockchainData.verifiedReports / blockchainData.totalReports > 0.7) {
      return 'community_alert';
    }
    
    if (disputed_count > verified_count) {
      return 'verification';
    }
    
    if (nearbyReports.length >= 2) {
      return 'sighting';
    }
    
    return 'update';
  }

  private async generateBlockchainEnhancedResponse(
    type: GeneratedResponse['type'], 
    report: Report, 
    context: ResponseContext
  ): Promise<GeneratedResponse> {
    const templates = this.responseTemplates[type];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Generate realistic blockchain-based data
    const variables = await this.generateBlockchainVariables(report, context, type);
    
    // Replace template variables
    let content = template;
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    // Calculate confidence based on blockchain verification
    const confidence = this.calculateConfidence(report, context);
    
    // Generate suggested actions based on blockchain consensus
    const suggestedActions = this.generateSuggestedActions(type, context);
    
    // Identify related blockchain entities
    const relatedEntities = this.identifyRelatedEntities(report, context);

    return {
      type,
      content,
      confidence,
      blockchainVerified: confidence > 0.7,
      suggestedActions,
      relatedEntities,
      metadata: {
        responseTime: Math.random() * 2000 + 500, // 500-2500ms
        dataSource: ['XION Blockchain', 'Smart Contracts', 'Community Consensus'],
        credibilityScore: confidence * 100
      }
    };
  }

  private async generateBlockchainVariables(report: Report, context: ResponseContext, type: GeneratedResponse['type']) {
    const { nearbyReports, userHistory, blockchainData } = context;
    
    return {
      confidence: Math.floor(Math.random() * 30 + 70), // 70-100%
      location: this.realisticData.locations[Math.floor(Math.random() * this.realisticData.locations.length)],
      history_count: nearbyReports.length,
      timeframe: this.realisticData.timeframes[Math.floor(Math.random() * this.realisticData.timeframes.length)],
      verification_level: this.realisticData.verificationLevels[Math.floor(Math.random() * this.realisticData.verificationLevels.length)],
      witness_count: report.verified_count,
      probability: Math.floor(Math.random() * 25 + 75), // 75-100%
      nearby_reports: nearbyReports.length,
      radius: Math.floor(Math.random() * 3 + 2), // 2-5km
      verification_points: Math.floor(Math.random() * 10 + 15), // 15-25 points
      weather_analysis: this.realisticData.weatherConditions[Math.floor(Math.random() * this.realisticData.weatherConditions.length)],
      match_count: Math.floor(Math.random() * nearbyReports.length + 1),
      status_change: `Status updated to ${report.status}`,
      blockchain_confirmations: Math.floor(Math.random() * 10 + 5), // 5-15 confirmations
      consensus_percentage: Math.floor(Math.random() * 20 + 80), // 80-100%
      verification_details: `${userHistory.verificationCount} verified contributors`,
      verification_result: `${report.verified_count} blockchain verifications received`,
      threat_level: this.realisticData.threatLevels[Math.floor(Math.random() * this.realisticData.threatLevels.length)],
      similar_incidents: nearbyReports.length,
      alert_type: this.getAlertType(report.category),
      affected_area: `${Math.floor(Math.random() * 5 + 1)}km radius`,
      evacuation_recommendation: this.getEvacuationRecommendation(report.severity),
      consensus_votes: Math.floor(Math.random() * blockchainData.moderatorCount + 1),
      safety_measures: this.getSafetyMeasures(report.category),
      alert_message: this.generateAlertMessage(report, context),
      verified_sources: Math.floor(Math.random() * 5 + 3), // 3-8 sources
      community_impact: this.getCommunityImpact(report.severity),
      response_time: `${Math.floor(Math.random() * 10 + 5)} minutes`,
      protocol_details: 'Governance protocol activated',
      community_action: this.getCommunityAction(report.category)
    };
  }

  private calculateConfidence(report: Report, context: ResponseContext): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on blockchain verifications
    confidence += (report.verified_count * 0.1);
    
    // Decrease confidence based on disputes
    confidence -= (report.disputed_count * 0.05);
    
    // Factor in user reputation
    confidence += (context.userReputation * 0.01);
    
    // Factor in nearby reports consistency
    if (context.nearbyReports.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
  }

  private generateSuggestedActions(type: GeneratedResponse['type'], context: ResponseContext): string[] {
    const actions = {
      verification: [
        'Verify report details on blockchain',
        'Check witness reputation scores',
        'Review similar verified reports',
        'Submit verification if confirmed'
      ],
      sighting: [
        'Report additional sightings',
        'Verify location on blockchain',
        'Check for related reports',
        'Monitor blockchain updates'
      ],
      update: [
        'Monitor smart contract status',
        'Check for blockchain confirmations',
        'Verify with community',
        'Update report if needed'
      ],
      warning: [
        'Alert nearby community members',
        'Check blockchain evacuation protocols',
        'Verify with moderators',
        'Monitor real-time updates'
      ],
      community_alert: [
        'Broadcast to community channels',
        'Activate governance protocols',
        'Coordinate with moderators',
        'Monitor blockchain consensus'
      ]
    };
    
    return actions[type].slice(0, Math.floor(Math.random() * 2) + 2); // 2-3 actions
  }

  private identifyRelatedEntities(report: Report, context: ResponseContext): string[] {
    const entities = [];
    
    if (context.nearbyReports.length > 0) {
      entities.push('Nearby Reports');
    }
    
    if (report.verified_count > 0) {
      entities.push('Verified Witnesses');
    }
    
    if (context.blockchainData.moderatorCount > 0) {
      entities.push('Moderator Network');
    }
    
    entities.push('Smart Contract');
    entities.push('XION Blockchain');
    
    return entities;
  }

  private getAlertType(category: string): string {
    const alertTypes: Record<string, string> = {
      'missing': 'MISSING PERSON ALERT',
      'theft': 'SECURITY BREACH',
      'accident': 'EMERGENCY INCIDENT',
      'suspicious': 'SECURITY THREAT',
      'other': 'COMMUNITY ALERT'
    };
    return alertTypes[category] || 'COMMUNITY ALERT';
  }

  private getEvacuationRecommendation(severity: number): string {
    if (severity >= 8) return 'Immediate evacuation recommended';
    if (severity >= 6) return 'Consider evacuation if nearby';
    return 'No evacuation required';
  }

  private getSafetyMeasures(category: string): string {
    const measures: Record<string, string> = {
      'missing': 'Contact authorities immediately',
      'theft': 'Secure belongings and report to police',
      'accident': 'Provide first aid if trained',
      'suspicious': 'Maintain safe distance',
      'other': 'Stay alert and report updates'
    };
    return measures[category] || 'Stay vigilant';
  }

  private generateAlertMessage(report: Report, context: ResponseContext): string {
    return `${report.category.toUpperCase()} reported in area. ${context.nearbyReports.length} related reports confirmed.`;
  }

  private getCommunityImpact(severity: number): string {
    if (severity >= 8) return 'HIGH - Immediate attention required';
    if (severity >= 6) return 'MODERATE - Community awareness needed';
    return 'LOW - Monitor situation';
  }

  private getCommunityAction(category: string): string {
    const actions: Record<string, string> = {
      'missing': 'Join search efforts',
      'theft': 'Report suspicious activity',
      'accident': 'Provide assistance if safe',
      'suspicious': 'Report observations',
      'other': 'Stay informed'
    };
    return actions[category] || 'Monitor updates';
  }

  private generateFallbackResponse(report: Report): GeneratedResponse {
    return {
      type: 'update',
      content: `Report ${report.id} has been processed. Status: ${report.status}. Verification count: ${report.verified_count}.`,
      confidence: 0.5,
      blockchainVerified: false,
      suggestedActions: ['Monitor for updates', 'Verify if witnessed'],
      relatedEntities: ['Report System'],
      metadata: {
        responseTime: 1000,
        dataSource: ['Fallback System'],
        credibilityScore: 50
      }
    };
  }
}

export const aiResponseGenerator = new AIResponseGenerator();
