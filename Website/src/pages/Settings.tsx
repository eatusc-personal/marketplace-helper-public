import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Shield,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Settings() {
  const { toast } = useToast()
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const testConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus('idle')

    try {
      // Test basic connection
      const { error } = await supabase
        .from('mb_listings')
        .select('count')
        .limit(1)

      if (error) throw error

      setConnectionStatus('success')
      toast({
        title: 'Connection Successful',
        description: 'Database connection is working properly',
      })
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('error')
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to the database',
        variant: 'destructive',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
  }

  const maskKey = (key: string) => {
    if (!key) return 'Not configured'
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Supabase Configuration</span>
          </CardTitle>
          <CardDescription>
            Your Supabase project settings and connection information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Project URL</label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                  {supabaseUrl || 'Not configured'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(supabaseUrl, 'Project URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={supabaseUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Anonymous Key</label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                  {maskKey(supabaseKey)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(supabaseKey, 'Anonymous Key')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={testConnection}
              disabled={testingConnection}
              variant={connectionStatus === 'success' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'outline'}
            >
              {testingConnection ? (
                'Testing...'
              ) : connectionStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connection OK
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Connection Failed
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            {connectionStatus === 'success' && (
              <Badge variant="secondary" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}

            {connectionStatus === 'error' && (
              <Badge variant="secondary" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Environment Information</span>
          </CardTitle>
          <CardDescription>
            Current environment and build information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Environment</label>
              <div className="mt-1">
                <Badge variant="outline">
                  {import.meta.env.MODE === 'development' ? 'Development' : 'Production'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Build Time</label>
              <div className="mt-1 text-sm text-gray-600">
                {new Date().toLocaleString()}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">App Version</label>
              <div className="mt-1 text-sm text-gray-600">
                v1.0.0
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">React Version</label>
              <div className="mt-1 text-sm text-gray-600">
                {React.version}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Privacy</span>
          </CardTitle>
          <CardDescription>
            Information about data security and privacy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Row Level Security (RLS)</h4>
                <p className="text-sm text-gray-600">
                  All database queries are protected by RLS policies that ensure users can only access their own data.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Authentication</h4>
                <p className="text-sm text-gray-600">
                  User authentication is handled securely through Supabase Auth with email/password verification.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Data Storage</h4>
                <p className="text-sm text-gray-600">
                  All data is stored securely in Supabase's PostgreSQL database with automatic backups.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">File Storage</h4>
                <p className="text-sm text-gray-600">
                  Images are stored securely in Supabase Storage with proper access controls.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Information */}
      <Card>
        <CardHeader>
          <CardTitle>Support & Documentation</CardTitle>
          <CardDescription>
            Get help and learn more about the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Documentation</h4>
              <p className="text-sm text-gray-600 mb-3">
                Learn how to use the marketplace helper effectively.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Supabase Docs
                </a>
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Support</h4>
              <p className="text-sm text-gray-600 mb-3">
                Need help? Open an issue in the project repository.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com/eatusc/marketplace-helper-public/issues" target="_blank" rel="noopener noreferrer">
                  GitHub Issues
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
