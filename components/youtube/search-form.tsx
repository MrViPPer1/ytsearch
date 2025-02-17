'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SearchFilters } from '@/types/youtube';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const formSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  minSubscribers: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional()
  ),
  maxSubscribers: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional()
  ),
  lastUploadDays: z.string().optional(),
  customLastUploadMonths: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().optional()
  ),
  customLastUploadDays: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().optional()
  ),
  hasEmail: z.boolean().default(false),
  showNewChannelsOnly: z.boolean().default(false),
  maxResults: z.string().optional(),
  customMaxResults: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(1).max(1000).optional()
  ),
  country: z.string().optional(),
  language: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const countries = [
  { value: 'all', label: 'Any' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'IN', label: 'India' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'BR', label: 'Brazil' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'RU', label: 'Russia' },
  { value: 'KR', label: 'South Korea' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'PL', label: 'Poland' },
];

const languages = [
  { value: 'all', label: 'Any' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'th', label: 'Thai' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'id', label: 'Indonesian' },
];

const maxResultsOptions = [
  { value: '50', label: '50 channels' },
  { value: '100', label: '100 channels' },
  { value: '200', label: '200 channels' },
  { value: '500', label: '500 channels' },
  { value: '1000', label: '1000 channels' },
  { value: 'custom', label: 'Custom' },
];

const uploadPeriods = [
  { value: '7', label: '1 Week' },
  { value: '30', label: '1 Month' },
  { value: '90', label: '3 Months' },
  { value: '180', label: '6 Months' },
  { value: '365', label: '1 Year' },
  { value: 'custom', label: 'Custom' },
];

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<SearchFilters>;
  showLoadAll?: boolean;
  loadAll?: boolean;
  onLoadAllChange?: (checked: boolean) => void;
}

function getWarnings(values: FormValues): { message: string; details: string }[] {
  const warnings: { message: string; details: string }[] = [];
  
  if (values.hasEmail) {
    warnings.push({
      message: "Email Search Information",
      details: "The email search will scan channel descriptions and branding settings. Success rate varies as many channels don't publicly display their email."
    });
  }

  const maxResults = values.maxResults === 'custom' && values.customMaxResults 
    ? values.customMaxResults 
    : values.maxResults 
      ? Number(values.maxResults) 
      : 50;
    
  if (maxResults > 50) {
    // Calculate quota usage:
    // - Initial search: 100 units
    // - Each batch of 50 results: Math.ceil(maxResults / 50) * 100
    // - Channel details: maxResults units
    const searchBatches = Math.ceil(maxResults / 50);
    const quotaPerBatch = 100;
    const totalQuota = (searchBatches * quotaPerBatch) + maxResults;

    warnings.push({
      message: "High Quota Usage Warning",
      details: `Searching for ${maxResults} channels will use approximately ${totalQuota} quota points:\n` +
              `• ${searchBatches} search batch${searchBatches > 1 ? 'es' : ''} (${searchBatches * quotaPerBatch} points)\n` +
              `• ${maxResults} channel detail requests (${maxResults} points)`
    });
  }

  return warnings;
}

export function SearchForm({ 
  onSearch, 
  isLoading, 
  defaultValues = {},
  showLoadAll = false,
  loadAll = false,
  onLoadAllChange
}: SearchFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: defaultValues.query || '',
      minSubscribers: defaultValues.minSubscribers,
      maxSubscribers: defaultValues.maxSubscribers,
      lastUploadDays: defaultValues.lastUploadDays?.toString(),
      customLastUploadDays: undefined,
      customLastUploadMonths: undefined,
      hasEmail: defaultValues.hasEmail || false,
      showNewChannelsOnly: defaultValues.showNewChannelsOnly || false,
      maxResults: defaultValues.maxResults?.toString() || '50',
      customMaxResults: undefined,
      country: defaultValues.country || 'all',
      language: defaultValues.language || 'all',
    },
  });

  const maxResultsValue = form.watch('maxResults');
  const lastUploadValue = form.watch('lastUploadDays');
  const hasEmailValue = form.watch('hasEmail');

  // Show warning when maxResults is high or hasEmail is true
  const showWarning = (maxResultsValue && parseInt(maxResultsValue) > 50) || hasEmailValue;

  async function onSubmit(values: FormValues) {
    console.log('Form submitted with values:', values);
    
    try {
      // Calculate total days from months and days
      let totalDays: string | undefined;
      if (values.lastUploadDays === 'custom') {
        const months = values.customLastUploadMonths || 0;
        const days = values.customLastUploadDays || 0;
        if (months > 0 || days > 0) {
          totalDays = ((months * 30) + days).toString();
        }
      } else {
        totalDays = values.lastUploadDays;
      }

      const maxResults = values.maxResults === 'custom' 
        ? values.customMaxResults 
        : values.maxResults 
          ? parseInt(values.maxResults) 
          : 50;

      const filters: SearchFilters = {
        type: 'channel',
        query: values.query,
        minSubscribers: values.minSubscribers,
        maxSubscribers: values.maxSubscribers,
        maxResults,
        lastUploadDays: totalDays,
        hasEmail: values.hasEmail,
        showNewChannelsOnly: values.showNewChannelsOnly,
        country: values.country === 'all' ? undefined : values.country,
        language: values.language === 'all' ? undefined : values.language,
        page: 1,
      };

      console.log('Calling search with filters:', filters);
      await onSearch(filters);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Warnings Section */}
        {showWarning && (
          <div className="space-y-3">
            {getWarnings(form.getValues()).map((warning, index) => (
              <Alert 
                key={index}
                className="bg-card border-muted"
              >
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <div className="font-medium text-sm">{warning.message}</div>
                  <AlertDescription className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                    {warning.details}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Main Search Box */}
        <div className="relative">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input 
                    placeholder="Search YouTube channels..." 
                    {...field}
                    className="h-14 px-6 text-lg rounded-2xl shadow-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <FormField
            control={form.control}
            name="hasEmail"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </FormControl>
                <FormLabel className="!mt-0 text-sm font-medium">Has Email</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showNewChannelsOnly"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </FormControl>
                <FormLabel className="!mt-0 text-sm font-medium">New Channels</FormLabel>
              </FormItem>
            )}
          />

          <div className="flex items-center space-x-2">
            <Switch
              checked={loadAll}
              onCheckedChange={onLoadAllChange}
              className="data-[state=checked]:bg-primary"
            />
            <label
              className="text-sm font-medium leading-none"
            >
              Load all results
            </label>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid gap-8 p-6 rounded-2xl border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Subscriber Range */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-muted-foreground">Subscriber Range</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="minSubscribers"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Min subscribers"
                        value={value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange(val === '' ? undefined : Number(val));
                        }}
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSubscribers"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Max subscribers"
                        value={value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange(val === '' ? undefined : Number(val));
                        }}
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Location and Language */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-muted-foreground">Location & Language</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language.value} value={language.value}>
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Upload Time and Results */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-muted-foreground">Search Configuration</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lastUploadDays"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={field.value === 'custom' ? 'w-[140px]' : 'w-full'}>
                            <SelectValue placeholder="Last upload" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {uploadPeriods.map((period) => (
                            <SelectItem key={period.value} value={period.value}>
                              {period.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value === 'custom' && (
                        <div className="flex gap-2 flex-1">
                          <Input
                            type="number"
                            placeholder="Months"
                            className="flex-1"
                            value={form.watch('customLastUploadMonths') ?? ''}
                            onChange={e => {
                              const months = e.target.value === '' ? undefined : parseInt(e.target.value);
                              form.setValue('customLastUploadMonths', months);
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Days"
                            className="flex-1"
                            value={form.watch('customLastUploadDays') ?? ''}
                            onChange={e => {
                              const days = e.target.value === '' ? undefined : parseInt(e.target.value);
                              form.setValue('customLastUploadDays', days);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxResults"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={field.value === 'custom' ? 'w-[140px]' : 'w-full'}>
                            <SelectValue placeholder="Results count" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {maxResultsOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value === 'custom' && (
                        <Input
                          type="number"
                          placeholder="Custom amount"
                          className="flex-1"
                          value={form.watch('customMaxResults') || ''}
                          onChange={e => form.setValue('customMaxResults', parseInt(e.target.value))}
                        />
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex flex-wrap items-center gap-4">
          <Button 
            type="button" 
            onClick={() => {
              const values = form.getValues();
              onSubmit(values);
            }}
            disabled={isLoading}
            size="lg"
            className="min-w-[200px] h-12 text-base rounded-xl"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Searching...</span>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              </>
            ) : (
              'Search Channels'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 
