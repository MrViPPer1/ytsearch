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
  category: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const categories = [
  { value: 'all', label: 'Any' },
  { value: 'tech', label: 'Technology' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'howto', label: 'How-to & Style' },
  { value: 'science', label: 'Science & Technology' },
  { value: 'sports', label: 'Sports' },
  { value: 'news', label: 'News & Politics' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'food', label: 'Food & Cooking' },
  { value: 'travel', label: 'Travel & Events' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'film', label: 'Film & Animation' },
  { value: 'pets', label: 'Pets & Animals' },
];

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
      category: defaultValues.category || 'all',
      country: defaultValues.country || 'all',
      language: defaultValues.language || 'all',
    },
  });

  const maxResultsValue = form.watch('maxResults');
  const lastUploadValue = form.watch('lastUploadDays');
  const hasEmailValue = form.watch('hasEmail');

  // Show warning when maxResults is high or hasEmail is true
  const showWarning = (maxResultsValue && parseInt(maxResultsValue) > 50) || hasEmailValue;
  const warningMessage = hasEmailValue 
    ? "The email search will look for emails in channel descriptions and branding settings. Not all channels make their email public."
    : maxResultsValue && parseInt(maxResultsValue) > 50 
      ? `Searching for ${maxResultsValue} channels will use more quota points. Consider reducing the number if you don't need that many results.`
      : "";

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

      const filters: SearchFilters = {
        query: values.query,
        minSubscribers: values.minSubscribers,
        maxSubscribers: values.maxSubscribers,
        maxResults: values.maxResults === 'custom' ? values.customMaxResults : Number(values.maxResults),
        lastUploadDays: totalDays,
        hasEmail: values.hasEmail,
        showNewChannelsOnly: values.showNewChannelsOnly,
        category: values.category === 'all' ? undefined : values.category,
        country: values.country === 'all' ? undefined : values.country,
        language: values.language === 'all' ? undefined : values.language,
      };

      console.log('Calling search with filters:', filters);
      await onSearch(filters);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          console.log('Form submit event triggered');
          form.handleSubmit(onSubmit)(e);
        }} 
        className="space-y-6"
      >
        {showWarning && (
          <Alert className="mb-4">
            <AlertDescription>{warningMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search Query</FormLabel>
                <FormControl>
                  <Input placeholder="Enter channel keywords..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-4 pt-7">
            <FormField
              control={form.control}
              name="hasEmail"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Has Email in Description</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showNewChannelsOnly"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">New Channels Only</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="minSubscribers"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>Min Subscribers</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 1000"
                    value={value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange(val === '' ? undefined : Number(val));
                    }}
                    {...field}
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
                <FormLabel>Max Subscribers</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Leave empty for no limit"
                    value={value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange(val === '' ? undefined : Number(val));
                    }}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
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
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
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
                <FormLabel>Language</FormLabel>
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

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="lastUploadDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Upload</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={field.value === 'custom' ? 'w-[140px]' : 'w-full'}>
                        <SelectValue placeholder="Select period" />
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
                <FormLabel>Number of Results</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={field.value === 'custom' ? 'w-[140px]' : 'w-full'}>
                        <SelectValue placeholder="Select number" />
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
                      placeholder="Enter number (1-1000)"
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

        <div className="flex items-center gap-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            onClick={(e) => {
              e.preventDefault();
              console.log('Button clicked directly');
              const values = form.getValues();
              onSubmit(values);
            }}
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

          {showLoadAll && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="loadAll"
                checked={loadAll}
                onCheckedChange={onLoadAllChange}
              />
              <label
                htmlFor="loadAll"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Load all results at once
              </label>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
} 
