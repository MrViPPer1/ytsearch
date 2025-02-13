'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Power, RefreshCw } from 'lucide-react';
import { ApiKey } from '@/types/youtube';
import { Progress } from '@/components/ui/progress';
import { ExcludedChannels } from '@/components/settings/excluded-channels';

const apiKeySchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API Key is required')
    .regex(/^AIza[0-9A-Za-z-_]{35}$/, 'Invalid YouTube API Key format'),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

interface QuotaInfo {
  quotaUsed: number;
  quotaLimit: number;
  remainingQuota: number;
  resetTime: string;
  apiKeyId: string;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo[]>([]);
  const { toast } = useToast();

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: '',
    },
  });

  // Load API keys and quota information
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [keysResponse, quotaResponse] = await Promise.all([
          fetch('/api/keys'),
          fetch('/api/quota')
        ]);

        if (!keysResponse.ok || !quotaResponse.ok) {
          const error = await keysResponse.json();
          throw new Error(error.error || 'Failed to load data');
        }

        const [keys, quota] = await Promise.all([
          keysResponse.json(),
          quotaResponse.json()
        ]);

        setApiKeys(keys);
        setQuotaInfo(quota);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const onSubmit = async (values: ApiKeyFormValues) => {
    if (!values.apiKey?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'API Key is required',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: values.apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add API key');
      }

      const newKey = await response.json();
      setApiKeys([...apiKeys, newKey]);
      form.reset();

      toast({
        title: 'Success',
        description: 'YouTube API key has been added',
      });
    } catch (error) {
      console.error('Error adding API key:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add API key',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isActive }),
      });

      if (!response.ok) throw new Error('Failed to update API key');

      setApiKeys(apiKeys.map(key => 
        key.id === id ? { ...key, isActive } : key
      ));

      toast({
        title: 'Success',
        description: `API key ${isActive ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update API key',
      });
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      setApiKeys(apiKeys.filter(key => key.id !== id));

      toast({
        title: 'Success',
        description: 'API key has been deleted',
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete API key',
      });
    }
  };

  const refreshQuota = async () => {
    try {
      const response = await fetch('/api/quota');
      if (!response.ok) {
        throw new Error('Failed to refresh quota information');
      }
      const data = await response.json();
      setQuotaInfo(data);
      toast({
        title: 'Success',
        description: 'Quota information updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh quota information',
      });
    }
  };

  // Calculate total quota usage
  const totalQuotaUsed = quotaInfo.reduce((sum, info) => sum + info.quotaUsed, 0);
  const totalQuotaLimit = quotaInfo.reduce((sum, info) => sum + info.quotaLimit, 0);
  const totalUsagePercentage = (totalQuotaUsed / totalQuotaLimit) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your YouTube API keys and other application settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>YouTube API Keys</CardTitle>
          <CardDescription>
            Add and manage your YouTube Data API v3 keys.
            You can get an API key from the{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Cloud Console
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter your YouTube API key"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Your API key will be securely stored and used for YouTube API requests.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add API Key
              </Button>
            </form>
          </Form>

          {/* Total Quota Summary */}
          {quotaInfo.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Total YouTube API Quota Usage</h3>
                <Button variant="outline" size="sm" onClick={refreshQuota}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Quota
                </Button>
              </div>
              <Progress value={totalUsagePercentage} className="h-2" />
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
          )}

          {/* Active API Keys */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Active API Keys</h3>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys added yet.</p>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => {
                  const keyQuota = quotaInfo.find(q => q.apiKeyId === key.id);
                  const usagePercentage = keyQuota 
                    ? (keyQuota.quotaUsed / keyQuota.quotaLimit) * 100 
                    : (key.quotaUsed / 10000) * 100;

                  return (
                    <div
                      key={key.id}
                      className="space-y-4 p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">
                            •••••{key.key.slice(-6)}
                            {keyQuota?.remainingQuota === 0 && (
                              <span className="ml-2 text-sm text-red-500">(Quota Exceeded)</span>
                            )}
                          </p>
                          <Progress value={usagePercentage} className="h-2" />
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Quota Used</p>
                              <p className="font-medium">
                                {keyQuota?.quotaUsed.toLocaleString() || key.quotaUsed.toLocaleString()} units ({usagePercentage.toFixed(1)}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Last Used / Reset</p>
                              <p className="font-medium">
                                {new Date(key.lastUsed).toLocaleDateString()} / {new Date().getHours() >= 7 ? 'Tomorrow' : 'Today'} at 12 AM PT
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleApiKey(key.id, !key.isActive)}
                            className={key.isActive ? 'text-green-500' : 'text-muted-foreground'}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteApiKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ExcludedChannels />
    </div>
  );
} 