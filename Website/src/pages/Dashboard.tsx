import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Clock, Plus, List } from 'lucide-react'


export default function Dashboard() {
  const [stats, setStats] = useState({
    totalListings: 0,
    withPhotos: 0,
    recentUpdates: 0,
    categoryCoverage: 0,
  })
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    console.log('=== DASHBOARD DEBUG START ===')
    fetchStats()

    // Test database connection
    const testConnection = async () => {
      try {
        console.log('🔍 Testing database connection...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('👤 Current user:', user)
        console.log('❌ User error:', userError)

        if (user) {
          console.log('🔍 Testing listings query for user:', user.id)
          const { data, error } = await supabase
            .from('mb_listings')
            .select('*')
            .eq('user_id', user.id)
            .limit(5)

          console.log('📊 Listings test result:', { data, error })
          console.log('📊 Listings count:', data?.length || 0)



        } else {
          console.log('❌ No user found!')
        }
      } catch (err) {
        console.error('💥 Database test error:', err)
      }
    }

    testConnection()
  }, [])

  const fetchStats = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      // Fetch listings for current user
      const { data: listings } = await supabase
        .from('mb_listings')
        .select('*')
        .eq('user_id', user.id)

              if (listings) {
          const totalListings = listings.length

          // Count listings with photos by checking if they have photos in the database
          const { data: photosData } = await supabase
            .from('mb_photos')
            .select('listing_id')
            .in('listing_id', listings.map(l => l.id))

          const listingsWithPhotos = new Set(photosData?.map(p => p.listing_id) || [])
          const withPhotos = listingsWithPhotos.size

          const recentUpdates = listings.filter(listing => {
            const updatedAt = new Date(listing.updated_at || listing.created_at)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return updatedAt > weekAgo
          }).length

          // Calculate category coverage
          const { data: categories } = await supabase
            .from('mb_categories')
            .select('id')

          const { data: listingsWithCategories } = await supabase
            .from('mb_listings')
            .select('fb_category_id, nd_category_id, cl_category_id')
            .eq('user_id', user.id)
            .not('fb_category_id', 'is', null)
            .or('nd_category_id.not.is.null,cl_category_id.not.is.null')

          const uniqueCategories = new Set()
          listingsWithCategories?.forEach(listing => {
            if (listing.fb_category_id) uniqueCategories.add(listing.fb_category_id)
            if (listing.nd_category_id) uniqueCategories.add(listing.nd_category_id)
            if (listing.cl_category_id) uniqueCategories.add(listing.cl_category_id)
          })

          const categoryCoverage = categories ?
            Math.round((uniqueCategories.size / categories.length) * 100) : 0

          setStats({
            totalListings,
            withPhotos,
            recentUpdates,
            categoryCoverage,
          })
        }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Create New Listing',
      description: 'Add a new item to sell',
      icon: Plus,
      href: '/listings/new',
      color: 'bg-blue-500',
    },
    {
      title: 'View My Listings',
      description: 'Manage your existing items',
      icon: List,
      href: '/listings',
      color: 'bg-green-500',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.withPhotos} with photos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recently Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentUpdates}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>


      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={action.href}>
                    {action.title}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>


    </div>
  )
}
