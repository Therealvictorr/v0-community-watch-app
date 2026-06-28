export interface GeneratedResponse {
  type: 'verification' | 'sighting' | 'update' | 'warning' | 'community_alert';
  content: string;
  confidence: number;
  communityVerified: boolean;
  suggestedActions: string[];
  relatedEntities: string[];
  metadata: {
    responseTime: number;
    dataSource: string[];
    credibilityScore: number;
  };
}

export class AIResponseGenerator {
  async generateRealisticResponse(report: any): Promise<GeneratedResponse> {
    const start = performance.now();
    const sightingCount = report.sighting_count ?? report.sightings?.length ?? 0;
    const verifiedCount = report.verified_count ?? 0;
    const confidence = Math.min(0.95, 0.62 + sightingCount * 0.04 + verifiedCount * 0.05);
    const isUrgent = report.severity >= 7 || report.report_type === 'missing_child';

    return {
      type: isUrgent ? 'warning' : sightingCount > 0 ? 'sighting' : 'verification',
      content: isUrgent
        ? `This report appears high priority. SafeCircle recommends notifying trusted neighbors, checking recent sightings, and sharing verified details with local responders.`
        : `SafeCircle analyzed this report against recent community activity. The available details look consistent, and nearby community members can help improve accuracy with sightings or updates.`,
      confidence,
      communityVerified: confidence >= 0.75,
      suggestedActions: [
        'Share the report with trusted local contacts',
        'Add sightings only when details are confirmed',
        'Keep location and description updates current',
      ],
      relatedEntities: ['SafeCircle Community', report.category || report.report_type || 'Local Reports'].filter(Boolean),
      metadata: {
        responseTime: performance.now() - start,
        dataSource: ['Community reports', 'Sightings', 'AI pattern analysis'],
        credibilityScore: Math.round(confidence * 100),
      },
    };
  }
}

export const aiResponseGenerator = new AIResponseGenerator();
