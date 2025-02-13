import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TutorialPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">How to Use YouTube Channel Search</h1>
        <p className="text-muted-foreground">
          A comprehensive guide to finding and analyzing YouTube channels using our advanced search tools.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🔑 Setting Up Your API Key</CardTitle>
            <CardDescription>
              Before you start searching, you need a YouTube Data API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Step-by-Step Setup</h3>
              <ol className="list-decimal pl-6 text-sm text-muted-foreground space-y-2">
                <li>Go to the <span className="font-medium">Settings</span> page using the navigation menu</li>
                <li>Visit the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the YouTube Data API v3 for your project</li>
                <li>Create an API key from the Credentials page</li>
                <li>Copy your API key and paste it in the settings page</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-2">
                Each API key has a daily quota limit of 10,000 units. The app will automatically manage your quota and switch to backup keys if available.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 Basic Search Features</CardTitle>
            <CardDescription>
              Core search functionality to find YouTube channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Search Query</h3>
              <p className="text-sm text-muted-foreground">
                Enter keywords related to the type of channels you&apos;re looking for. You can search by:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Channel name or keywords in channel description</li>
                <li>Content topics or themes</li>
                <li>Niche or industry terms</li>
                <li>Brand or company names</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Subscriber Range</h3>
              <p className="text-sm text-muted-foreground">
                Filter channels by their subscriber count:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Set minimum subscribers to find established channels</li>
                <li>Set maximum subscribers to find growing channels</li>
                <li>Leave empty to search across all sizes</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎯 Advanced Filters</CardTitle>
            <CardDescription>
              Narrow down your search with precise filtering options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Upload Activity</h3>
              <p className="text-sm text-muted-foreground">
                Find active channels based on their last upload:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>1 Week - Very active channels</li>
                <li>1 Month - Regularly active channels</li>
                <li>3 Months - Moderately active channels</li>
                <li>Custom - Set specific timeframe in months and days</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Email & Contact</h3>
              <p className="text-sm text-muted-foreground">
                Enable &quot;Has Email in Description&quot; to find channels open to collaboration:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Searches channel descriptions for contact information</li>
                <li>Checks channel&apos;s business email field</li>
                <li>Identifies various email formats and patterns</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Location & Language</h3>
              <p className="text-sm text-muted-foreground">
                Target specific regions and languages:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Filter by country to find local creators</li>
                <li>Select language for content in specific languages</li>
                <li>Combine with other filters for precise targeting</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Search Results</CardTitle>
            <CardDescription>
              Understanding and managing your search results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Channel Information</h3>
              <p className="text-sm text-muted-foreground">
                Each result card shows comprehensive channel details:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Channel name and custom URL (@handle)</li>
                <li>Subscriber count and total view count</li>
                <li>Video count and channel creation date</li>
                <li>Contact email (if available)</li>
                <li>Country and language information</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Result Management</h3>
              <p className="text-sm text-muted-foreground">
                Tools to organize and filter your results:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Click channel names to visit their YouTube pages</li>
                <li>Use the exclude button to hide channels from future searches</li>
                <li>Bulk exclude all channels from current results</li>
                <li>Load more results with pagination controls</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⚙️ Additional Features</CardTitle>
            <CardDescription>
              Extra tools to enhance your channel research
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Search History</h3>
              <p className="text-sm text-muted-foreground">
                Access your previous searches:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>View all past searches with their filters</li>
                <li>See the number of results for each search</li>
                <li>Repeat previous searches instantly</li>
                <li>Export search history as JSON or CSV</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Excluded Channels</h3>
              <p className="text-sm text-muted-foreground">
                Manage your channel exclusion list:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>View all excluded channels</li>
                <li>Remove channels from exclusion list</li>
                <li>Import/export exclusion lists</li>
                <li>Automatically filter out excluded channels from searches</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Quota Management</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your API usage:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>View remaining daily quota for each API key</li>
                <li>Track quota usage per search operation</li>
                <li>Automatic switching between available API keys</li>
                <li>Quota reset time information</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💡 Pro Tips</CardTitle>
            <CardDescription>
              Get the most out of your channel research
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Search Strategies</h3>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Use specific niche keywords for better targeting</li>
                <li>Combine subscriber ranges with upload frequency</li>
                <li>Start with broader searches, then refine with filters</li>
                <li>Use multiple API keys for larger search operations</li>
                <li>Export results regularly for team collaboration</li>
                <li>Check channel activity before outreach</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Quota Optimization</h3>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Limit initial searches to 50 results</li>
                <li>Use saved searches for repeated queries</li>
                <li>Add multiple API keys as backup</li>
                <li>Monitor quota usage in settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 