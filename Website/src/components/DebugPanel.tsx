import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Bug } from 'lucide-react'

interface DebugPanelProps {
  data: any
  title?: string
}

export default function DebugPanel({ data, title = "Debug Information" }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bug className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-800">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-orange-600 hover:text-orange-700"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription className="text-orange-600">
          Development debug information - will be removed in production
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data).map(([key, value]) => (
              <div key={key}>
                <h3 className="font-semibold text-orange-800 mb-2">{key}:</h3>
                <pre className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
