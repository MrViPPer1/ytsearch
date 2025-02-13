import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TutorialPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Tutorial</h1>
        <p className="text-muted-foreground">
          Learn how to use YouTube Channel Search effectively.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Set up your API key and start searching for YouTube channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">1. Set Up Your API Key</h3>
              <p className="text-sm text-muted-foreground">
                Before you can start searching, you need to set up your YouTube Data API key:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Go to the Settings page</li>
                <li>Visit the Google Cloud Console to create an API key</li>
                <li>Enable the YouTube Data API v3</li>
                <li>Copy your API key and paste it in the settings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">2. Search for Channels</h3>
              <p className="text-sm text-muted-foreground">
                Use the search form to find YouTube channels:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Enter keywords in the search query</li>
                <li>Set subscriber count ranges</li>
                <li>Filter by upload frequency</li>
                <li>Filter by country and language</li>
                <li>Toggle email requirement</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced Features</CardTitle>
            <CardDescription>
              Make the most of the search capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Search History</h3>
              <p className="text-sm text-muted-foreground">
                Keep track of your searches and reuse them:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>View all previous searches</li>
                <li>See the number of results for each search</li>
                <li>Repeat previous searches with one click</li>
                <li>Export search history as JSON or CSV</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Search Tips</h3>
              <p className="text-sm text-muted-foreground">
                Get better results with these tips:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Use specific keywords related to your niche</li>
                <li>Combine subscriber ranges with upload frequency</li>
                <li>Filter by country to find local creators</li>
                <li>Use the email filter to find channels open to collaboration</li>
                <li>Check the channel's last upload date to ensure activity</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Understanding Results</CardTitle>
            <CardDescription>
              Interpret the search results effectively
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Channel Information</h3>
              <p className="text-sm text-muted-foreground">
                Each result card shows:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Channel name and custom URL</li>
                <li>Subscriber count and total views</li>
                <li>Video count and join date</li>
                <li>Contact email (if available)</li>
                <li>Country information</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Taking Action</h3>
              <p className="text-sm text-muted-foreground">
                After finding relevant channels:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                <li>Click the channel name to visit their YouTube page</li>
                <li>Save the contact information for outreach</li>
                <li>Use the history feature to track your research</li>
                <li>Export results for team collaboration</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 