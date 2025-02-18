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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

function QuotaUpdateDialog({ 
  apiKey, 
  onUpdate,
  refreshQuota 
}: { 
  apiKey: ApiKey; 
  onUpdate: (id: string, quota: number) => Promise<void>;
  refreshQuota: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      quotaUsed: apiKey.quotaUsed
    }
  });

  const onSubmit = async (values: { quotaUsed: number }) => {
    try {
      setIsUpdating(true);
      await onUpdate(apiKey.id, values.quotaUsed);
      await refreshQuota();
      toast({
        title: 'Success',
        description: 'Quota usage updated successfully'
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update quota usage'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Update Quota</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Quota Usage</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Quota Used</label>
            <Input
              type="number"
              min="0"
              max="10000"
              {...form.register('quotaUsed', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Enter the actual quota usage from Google Cloud Console
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const updateQuotaUsage = async (id: string, quotaUsed: number) => {
  const response = await fetch('/api/quota/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, quotaUsed })
  });

  if (!response.ok) {
    throw new Error('Failed to update quota usage');
  }
};

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
            {' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Cloud Console
            </a>
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
                        type="text"
                        placeholder="Enter your YouTube API key that starts with AIza"
                        disabled={isLoading}
                      />
                    </FormControl>
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
            <div className="space-y-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Total YouTube API Quota Usage</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshQuota}
                  className="shadow-sm hover:shadow transition-all"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Quota
                </Button>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-b from-card/50 to-card shadow-lg border">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Usage</span>
                      <span className={
                        totalUsagePercentage > 90 
                          ? 'text-destructive font-medium' 
                          : totalUsagePercentage > 70 
                            ? 'text-warning font-medium' 
                            : 'text-success font-medium'
                      }>{totalUsagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/30 overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all rounded-full shadow-lg ${
                          totalUsagePercentage > 90 
                            ? 'bg-red-500' 
                            : totalUsagePercentage > 70 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${totalUsagePercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm">Total Used</p>
                      <p className="text-2xl font-semibold">{totalQuotaUsed.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">of {totalQuotaLimit.toLocaleString()} units</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm">Remaining Quota</p>
                      <p className="text-2xl font-semibold">{(totalQuotaLimit - totalQuotaUsed).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">units available</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm">Active API Keys</p>
                      <p className="text-2xl font-semibold">{quotaInfo.filter(info => info.remainingQuota > 0).length}</p>
                      <p className="text-xs text-muted-foreground">of {quotaInfo.length} total keys</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm">Resets At</p>
                      <p className="text-2xl font-semibold">12 AM</p>
                      <p className="text-xs text-muted-foreground">Pacific Time (PT)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active API Keys */}
          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-xl font-semibold">API Keys</h3>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys added yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apiKeys.map((key) => {
                  const keyQuota = quotaInfo.find(q => q.apiKeyId === key.id);
                  const usagePercentage = keyQuota 
                    ? (keyQuota.quotaUsed / keyQuota.quotaLimit) * 100 
                    : (key.quotaUsed / 10000) * 100;

                  return (
                    <div
                      key={key.id}
                      className={`group relative rounded-xl overflow-hidden transition-all duration-200 
                        shadow-lg hover:shadow-xl border bg-gradient-to-b from-card/50 to-card 
                        ${usagePercentage > 90 
                          ? 'border-destructive/40' 
                          : usagePercentage > 70 
                            ? 'border-warning/40' 
                            : 'border-success/40'}`
                      }
                    >
                      {/* Status Bar */}
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${
                        key.isActive 
                          ? usagePercentage > 90 
                            ? 'bg-destructive' 
                            : usagePercentage > 70 
                              ? 'bg-warning' 
                              : 'bg-success'
                          : 'bg-muted'
                      }`} />

                      <div className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold tracking-wide">
                                AIzaSy...{key.key.slice(-4)}
                              </p>
                              <div className="text-sm text-muted-foreground">
                                <span>Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}</span>
                              </div>
                            </div>
                            <QuotaUpdateDialog apiKey={key} onUpdate={updateQuotaUsage} refreshQuota={refreshQuota} />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Estimated Quota Usage</span>
                              <span className={
                                usagePercentage > 90 
                                  ? 'text-destructive font-medium' 
                                  : usagePercentage > 70 
                                    ? 'text-warning font-medium' 
                                    : 'text-success font-medium'
                              }>{usagePercentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted/30 overflow-hidden shadow-inner">
                              <div 
                                className={`h-full transition-all rounded-full shadow-lg ${
                                  usagePercentage > 90 
                                    ? 'bg-red-500' 
                                    : usagePercentage > 70 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                }`}
                                style={{ width: `${usagePercentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <p className="text-muted-foreground text-xs">Used / Total</p>
                              <p className="font-medium">
                                {keyQuota?.quotaUsed.toLocaleString() || key.quotaUsed.toLocaleString()} / 10,000
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Resets At</p>
                              <p className="font-medium">
                                {new Date().getHours() >= 7 ? 'Tomorrow' : 'Today'} 12 AM PT
                              </p>
                            </div>
                          </div>

                          {keyQuota?.remainingQuota === 0 && (
                            <div className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                              Quota Exceeded - Switch to Another Key
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            variant={key.isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleApiKey(key.id, !key.isActive)}
                            className={`flex-1 shadow-sm hover:shadow ${
                              key.isActive 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'border-red-500 text-red-500 hover:bg-red-50'
                            }`}
                          >
                            <Power className={`h-4 w-4 mr-2 ${key.isActive ? 'text-white' : 'text-red-500'}`} />
                            {key.isActive ? 'Active' : 'Inactive'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteApiKey(key.id)}
                            className="shadow-sm hover:shadow flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete API
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