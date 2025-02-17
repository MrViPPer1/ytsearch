'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Book, Search, Zap, Database, Settings, LineChart } from 'lucide-react';

export default function TutorialPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      <div className="relative bg-gradient-to-b from-muted/50 to-muted p-8 rounded-2xl mb-12">
        <div className="absolute inset-0 bg-grid-white/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] rounded-2xl" />
        <div className="relative space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">How to Use YouTube Channel Search</h1>
          <p className="text-muted-foreground text-lg">A step-by-step guide to finding and analyzing YouTube channels effectively</p>
        </div>
      </div>

      {/* Getting Started */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <CardTitle>Getting Started</CardTitle>
          </div>
          <CardDescription>Essential setup and basic usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-500/90">Getting Your YouTube API Key</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2 text-blue-500/90">1. Create a Google Cloud Project</h4>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                  <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a></li>
                  <li>Click on the project dropdown at the top and select "New Project"</li>
                  <li>Enter a project name (e.g., "YouTube Channel Search")</li>
                  <li>Click "Create" to create your project</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2 text-blue-500/90">2. Enable the YouTube Data API</h4>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                  <li>In your new project, go to "APIs & Services" → "Library"</li>
                  <li>Search for "YouTube Data API v3"</li>
                  <li>Click on the API and press "Enable"</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2 text-blue-500/90">3. Create API Credentials</h4>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                  <li>Go to "APIs & Services" → "Credentials"</li>
                  <li>Click "Create Credentials" → "API Key"</li>
                  <li>Your new API key will be displayed - copy it</li>
                  <li>Click "Edit" on the API key for security settings</li>
                  <li>Under "API restrictions", select "YouTube Data API v3"</li>
                  <li>Click "Save" to apply restrictions</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2 text-blue-500/90">4. Add the API Key to the App</h4>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                  <li>In the app, go to the Settings page</li>
                  <li>Click "Add API Key" and paste your key</li>
                  <li>The app will verify your key automatically</li>
                  <li>Important: You can only create one API key per Google Cloud project</li>
                  <li>To get more quota, create additional projects and add their API keys</li>
                </ol>
              </div>

              <Alert className="bg-gradient-to-r from-blue-500/10 via-blue-400/10 to-blue-500/10 border-blue-300">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <AlertDescription className="ml-3 space-y-4">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-lg">Important Notes:</h4>
                  
                  {/* Daily Quota Section */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-600 dark:text-blue-200">Daily Quota</h5>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Each API key has a daily quota limit of 10,000 points</li>
                      <li>The quota resets at midnight Pacific Time (PT)</li>
                    </ul>
                  </div>

                  {/* API Key Rules */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-600 dark:text-blue-200">API Key Rules</h5>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>You can only create one YouTube API key per project</li>
                      <li>Keep your API key secure and never share it publicly</li>
                    </ul>
                  </div>

                  {/* Getting More Quota */}
                  <div className="space-y-2 bg-blue-500/5 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-medium text-blue-700 dark:text-blue-300">How to Get More Quota:</h5>
                    <div className="ml-2 space-y-1">
                      <div className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        <p>Create a new Google Account <span className="text-blue-600 dark:text-blue-300 font-medium">(important: same account = same quota)</span></p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        <p>Create a new project in that account</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        <p>Set up a new API key following steps 1-4</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        <p>Add the new API key to the app</p>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Features */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-500" />
            <CardTitle>Search Features</CardTitle>
          </div>
          <CardDescription>Learn how to use the powerful search capabilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 p-4 rounded-lg border bg-card">
              <h3 className="font-semibold text-purple-500/90 flex items-center gap-2">
                <Book className="h-4 w-4" />
                Basic Search
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li>Enter keywords in the main search box</li>
                <li>Use quotes for exact matches (e.g., "tech reviews")</li>
                <li>Combine multiple keywords (e.g., gaming tutorial)</li>
                <li>Each search returns up to 50 channels per page</li>
                <li>Use "Show More" to load additional results</li>
              </ul>
            </div>

            <div className="space-y-2 p-4 rounded-lg border bg-card">
              <h3 className="font-semibold text-purple-500/90 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Filters
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li><strong>Has Email:</strong> Only show channels with visible contact email
                  <ul className="list-disc list-inside ml-6 mt-1 text-muted-foreground">
                    <li>Scans channel description and about section</li>
                    <li>Detects various email formats and obfuscation</li>
                    <li>Uses more quota points for thorough scanning</li>
                  </ul>
                </li>
                <li><strong>New Channels:</strong> Excludes previously hidden channels</li>
                <li><strong>Load All:</strong> Fetches all results at once (uses more quota)</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold text-purple-500/90 mb-3">Advanced Filters</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Subscriber Range</h4>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>Set minimum subscriber count to filter larger channels</li>
                  <li>Set maximum to focus on channels within a specific range</li>
                  <li>Leave empty to include all subscriber counts</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Location & Language</h4>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>Filter by channel's primary country</li>
                  <li>Filter by content language</li>
                  <li>Combine with other filters for precise targeting</li>
                </ul>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Search Tips:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Use specific, targeted keywords for better results</li>
                <li>When searching for emails, try business-related terms</li>
                <li>Larger channels are more likely to display contact info</li>
                <li>Some regions have higher email display rates</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Understanding Quota Usage */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-green-500" />
            <CardTitle>Understanding Quota Usage</CardTitle>
          </div>
          <CardDescription>Learn how API quota is calculated and optimized</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-green-500/90">How Quota Works</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2">Search Request</h4>
                <p className="text-sm text-muted-foreground">Costs 100 points and returns up to 50 channels</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2">Channel Details</h4>
                <p className="text-sm text-muted-foreground">Costs 1 point per channel</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card/50">
            <h4 className="font-medium text-green-700 mb-3">Example Quota Calculation</h4>
            <div className="space-y-2 text-sm">
              <p>If you search for 100 channels, the app needs:</p>
              <div className="grid gap-2 mt-2">
                <div className="flex items-center gap-2 p-2 rounded bg-green-100/50">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                  <span>2 search requests = 200 points (2 × 100)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-200/50">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                  <span>100 channel details = 100 points (100 × 1)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-300/50 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                  <span>Total: 300 quota points</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold text-green-500/90 mb-3">Quota Optimization Tips</h3>
            <ul className="grid gap-2">
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                Start with smaller result sets (50 channels or less)
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                Use specific search terms to get more relevant results
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                Add multiple API keys to increase daily quota
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-0.5" />
                Monitor quota usage in the Settings page
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Managing Results */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            <CardTitle>Managing Results</CardTitle>
          </div>
          <CardDescription>How to work with search results and history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 p-4 rounded-lg border bg-card">
              <h3 className="font-semibold text-orange-500/90">Search Results</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li>View channel details including subscriber count, views, and contact info</li>
                <li>Click channel names to visit their YouTube pages</li>
                <li>Use the exclude button to hide channels from future searches</li>
                <li>Export results in CSV or JSON format</li>
              </ul>
            </div>

            <div className="space-y-2 p-4 rounded-lg border bg-card">
              <h3 className="font-semibold text-orange-500/90">Search History</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li>Access previous searches in the History tab</li>
                <li>View detailed search parameters and results</li>
                <li>Repeat previous searches with one click</li>
                <li>Export individual search results or entire history</li>
                <li>The History tab will clear searches after 30 days</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold text-orange-500/90 mb-3">Excluded Channels</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>Manage excluded channels in the Settings page</li>
              <li>Import/export exclusion lists</li>
              <li>Remove channels from the exclusion list</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="border-l-4 border-l-sky-500">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-sky-500" />
            <CardTitle>Best Practices</CardTitle>
          </div>
          <CardDescription>Tips for effective channel searching</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Use specific, targeted search terms for better results',
              'Combine filters to narrow down your search',
              'Save important searches for future reference',
              'Export results regularly to maintain your database',
              'Monitor and manage your API quota usage',
              'Use the exclusion list to avoid duplicate results'
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <div className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-sm">{tip}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 