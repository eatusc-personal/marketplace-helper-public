import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Package,
  Shield,
  Mail,
  Calendar
} from 'lucide-react'

interface User {
  user_id: string
  email: string
  full_name: string
  is_admin: boolean
  zip_code: string
  avatar_url: string
  bio: string
  created_at: string
  listings_count: number
  photos_count: number
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 UserManagement component mounted, starting fetchUsers...')
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      console.log('🔍 Starting fetchUsers...')

      // Get current user to verify admin status
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        console.log('❌ No user found')
        return
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single()

      if (!profile || profile.is_admin !== true) {
        console.log('❌ User is not admin')
        return
      }

      console.log('✅ Admin verified, fetching users...')

      // Fetch all users using the admin function
      const { data: allUsers, error: usersError } = await supabase
        .rpc('get_all_users_for_admin')

      if (usersError) {
        console.error('❌ Error fetching users:', usersError)
        return
      }

      console.log('📊 Users fetched:', allUsers?.length || 0)

      if (!allUsers || allUsers.length === 0) {
        console.log('📊 No users found')
        setUsers([])
        return
      }

      // Fetch listings and photos counts for each user
      const usersWithStats = await Promise.all(
        allUsers.map(async (user: any) => {
          try {
            // Get listings count for this user
            const { count: listingsCount } = await supabase
              .from('mb_listings')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.user_id)

            // Get photos count for this user using database function
            const { data: photosCount } = await supabase
              .rpc('get_photo_count_for_user', {
                target_user_uuid: user.user_id,
                admin_user_uuid: currentUser.id
              })

            console.log(`📸 User ${user.user_id} photos count:`, photosCount)

            return {
              ...user,
              listings_count: listingsCount || 0,
              photos_count: photosCount || 0,
            }
          } catch (error) {
            console.error(`Error fetching stats for user ${user.user_id}:`, error)
            return {
              ...user,
              listings_count: 0,
              photos_count: 0,
            }
          }
        })
      )

      console.log('📊 Users with stats:', usersWithStats.length)
      setUsers(usersWithStats)
    } catch (error) {
      console.error('💥 Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading users...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button asChild>
          <Link to="/admin">Back to Admin</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>
            Manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                There are no users in the system yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.user_id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name || user.email}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">
                            {user.full_name || 'No name'}
                          </h3>
                          {user.is_admin && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Joined {formatDate(user.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>{user.listings_count} listings</span>
                        </div>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{user.photos_count} photos</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/users/${user.user_id}/listings`}>
                          View Listings
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
