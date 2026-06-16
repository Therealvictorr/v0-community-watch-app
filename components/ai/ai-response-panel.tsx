'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, Shield, Users, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { aiResponseGenerator, GeneratedResponse } from '@/lib/ai-response-generator';
import { Report } from '@/lib/xion-contracts';
import { useXionWallet } from '@/hooks/use-xion-wallet';

interface AIResponsePanelProps {
  report: Report;
  onResponseGenerated?: (response: GeneratedResponse) => void;
}

export function AIResponsePanel({ report, onResponseGenerated }: AIResponsePanelProps) {
  const [response, setResponse] = useState<GeneratedResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useXionWallet();

  useEffect(() => {
    if (report) {
      generateResponse();
    }
  }, [report]);

  const generateResponse = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const generatedResponse = await aiResponseGenerator.generateRealisticResponse(report, address);
      setResponse(generatedResponse);
      onResponseGenerated?.(generatedResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI response');
    } finally {
      setIsGenerating(false);
    }
  };

  const getResponseIcon = (type: GeneratedResponse['type']) => {
    const icons = {
      verification: <Shield className="h-5 w-5" />,
      sighting: <Users className="h-5 w-5" />,
      update: <Info className="h-5 w-5" />,
      warning: <AlertTriangle className="h-5 w-5" />,
      community_alert: <Zap className="h-5 w-5" />
    };
    return icons[type];
  };

  const getResponseColor = (type: GeneratedResponse['type']) => {
    const colors = {
      verification: 'bg-blue-500',
      sighting: 'bg-green-500',
      update: 'bg-gray-500',
      warning: 'bg-orange-500',
      community_alert: 'bg-red-500'
    };
    return colors[type];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isGenerating) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            AI Analysis in Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Analyzing blockchain data...</p>
                <p className="text-xs text-muted-foreground">Querying smart contracts...</p>
                <p className="text-xs text-muted-foreground">Generating realistic response...</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            AI Analysis Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={generateResponse} className="mt-4" variant="outline">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Analysis
          </div>
          <div className="flex items-center gap-2">
            {response.blockchainVerified && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Blockchain Verified
              </Badge>
            )}
            <Badge variant="outline" className={getConfidenceColor(response.confidence)}>
              {Math.round(response.confidence * 100)}% Confidence
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Response Type and Content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full text-white ${getResponseColor(response.type)}`}>
              {getResponseIcon(response.type)}
            </div>
            <Badge variant="outline" className="capitalize">
              {response.type.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm leading-relaxed">{response.content}</p>
          </div>
        </div>

        {/* Suggested Actions */}
        {response.suggestedActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Suggested Actions
            </h4>
            <div className="space-y-2">
              {response.suggestedActions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Entities */}
        {response.relatedEntities.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Related Blockchain Entities
            </h4>
            <div className="flex flex-wrap gap-2">
              {response.relatedEntities.map((entity, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {entity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Analysis Metadata
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Response Time:</span>
              <p className="font-medium">{Math.round(response.metadata.responseTime)}ms</p>
            </div>
            <div>
              <span className="text-muted-foreground">Credibility Score:</span>
              <p className={`font-medium ${getConfidenceColor(response.confidence)}`}>
                {response.metadata.credibilityScore}/100
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-sm">Data Sources:</span>
            <div className="flex flex-wrap gap-1">
              {response.metadata.dataSource.map((source, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Blockchain Connection Status */}
        {!isConnected && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Connect your XION wallet to enable blockchain-verified responses and enhanced analysis.
            </AlertDescription>
          </Alert>
        )}

        {/* Regenerate Button */}
        <Button onClick={generateResponse} variant="outline" size="sm" className="w-full">
          <Brain className="h-4 w-4 mr-2" />
          Regenerate Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
