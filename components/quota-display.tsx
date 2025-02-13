'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatTimeUntil } from '@/lib/utils';

interface QuotaInfo {
  quotaUsed: number;
  quotaLimit: number;
  remainingQuota: number;
  resetTime: string;
  projectId?: string;
  apiKeyId: string;
}

export function QuotaDisplay() {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  async function fetchQuotaInfo() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/quota');
      if (!response.ok) {
        throw new Error('Failed to fetch quota information');
      }
      const data = await response.json();
      setQuotaInfo(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  // Update the countdown timer every minute
  useEffect(() => {
    function updateTimeUntilReset() {
      // Get current time in PT
      const now = new Date();
      // Get tomorrow at midnight PT
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(7, 0, 0, 0); // 7 AM UTC = Midnight PT

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReset(`${hours}h ${minutes}m`);
    }

    updateTimeUntilReset();
    const interval = setInterval(updateTimeUntilReset, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchQuotaInfo();
  }, []);

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-red-500">Error Loading Quota</CardTitle>
          <Button variant="outline" size="icon" onClick={fetchQuotaInfo}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle><Skeleton className="h-4 w-[200px]" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (quotaInfo.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>YouTube API Quota Usage</CardTitle>
          <Button variant="outline" size="icon" onClick={fetchQuotaInfo}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No API keys found. Add an API key in the settings below.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total quota usage across all keys
  const totalQuotaUsed = quotaInfo.reduce((sum, info) => sum + info.quotaUsed, 0);
  const totalQuotaLimit = quotaInfo.reduce((sum, info) => sum + info.quotaLimit, 0);
  const totalUsagePercentage = (totalQuotaUsed / totalQuotaLimit) * 100;

  return (
    <div className="space-y-4">
      {/* Overall Quota Summary */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Total YouTube API Quota Usage</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Resets in {timeUntilReset} (at midnight PT)
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchQuotaInfo}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={totalUsagePercentage} className="w-full" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Used</p>
                <p className="font-medium">{totalQuotaUsed.toLocaleString()} units ({totalUsagePercentage.toFixed(1)}%)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Remaining</p>
                <p className="font-medium">{(totalQuotaLimit - totalQuotaUsed).toLocaleString()} units</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Limit</p>
                <p className="font-medium">{totalQuotaLimit.toLocaleString()} units</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Keys</p>
                <p className="font-medium">{quotaInfo.filter(info => info.remainingQuota > 0).length} of {quotaInfo.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual API Key Quotas */}
      {quotaInfo.map((info) => {
        const usagePercentage = (info.quotaUsed / info.quotaLimit) * 100;
        const resetDate = new Date(info.resetTime);
        const formattedResetTime = resetDate.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZoneName: 'short',
        });

        return (
          <Card key={info.apiKeyId} className="w-full">
            <CardHeader>
              <CardTitle className="text-base">
                API Key •••••{info.apiKeyId.slice(-6)}
                {info.remainingQuota === 0 && (
                  <span className="ml-2 text-sm text-red-500">(Quota Exceeded)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={usagePercentage} className="w-full" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Used</p>
                    <p className="font-medium">{info.quotaUsed.toLocaleString()} units ({usagePercentage.toFixed(1)}%)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-medium">{info.remainingQuota.toLocaleString()} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Limit</p>
                    <p className="font-medium">{info.quotaLimit.toLocaleString()} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {info.remainingQuota > 0 ? (
                        <span className="text-green-500">Active</span>
                      ) : (
                        <span className="text-red-500">Exceeded</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 