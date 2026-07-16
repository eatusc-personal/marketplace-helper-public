import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbox } from '@/components/ui/lightbox'
import {
  ArrowLeft,
  Package,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react'

interface Listing {
  id: string
  title: string
  description: string
  price: number
  category: string
  condition: string
  location: string
  created_at: string
  updated_at: string
  photos?: {
    id: string
    photo_url: string
    position: number
    created_at: string
  }[]
}

interface UserInfo {
  user_id: string
  email: string
  full_name: string
  is_admin: boolean
}

export default function UserListings() {
  const { userId } = useParams<{ userId: string }>()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    if (userId) {
      fetchUserListings()
    }
  }, [userId])

  const fetchUserListings = async () => {
    try {
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

      // Fetch user info
      const { data: allUsers } = await supabase.rpc('get_all_users_for_admin')
      const targetUser = allUsers?.find((u: any) => u.user_id === userId)

      if (targetUser) {
        setUserInfo({
          user_id: targetUser.user_id,
          email: targetUser.email,
          full_name: targetUser.full_name,
          is_admin: targetUser.is_admin
        })
      }

      // Fetch user's listings
      const { data: listingsData, error } = await supabase
        .from('mb_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching listings:', error)
        return
      }

      console.log('📋 Listings fetched:', listingsData?.length || 0)

      // Fetch photos for each listing using the database function
      if (listingsData && listingsData.length > 0) {
        const listingsWithPhotos = await Promise.all(
          listingsData.map(async (listing) => {
            const { data: photos } = await supabase
              .rpc('get_photos_for_listing', {
                listing_uuid: listing.id,
                user_uuid: currentUser.id
              })

            return {
              ...listing,
              photos: photos || []
            }
          })
        )
        setListings(listingsWithPhotos)
      } else {
        setListings([])
      }
    } catch (error) {
      console.error('Error fetching user listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (images: string[], startIndex: number = 0) => {
    setLightboxImages(images)
    setLightboxIndex(startIndex)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
    setLightboxImages([])
    setLightboxIndex(0)
  }

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)
  }

  const previousImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Listings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading listings...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">User Listings</h1>
        </div>
      </div>

      {userInfo && (
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {userInfo.full_name || 'No name'}
                </h3>
                <p className="text-muted-foreground">{userInfo.email}</p>
                {userInfo.is_admin && (
                  <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800">
                    Admin User
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listings ({listings.length})</CardTitle>
          <CardDescription>
            All listings created by this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No listings found</h3>
              <p className="text-muted-foreground">
                This user hasn't created any listings yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    {/* Photos */}
                    <div className="flex-shrink-0">
                      {listing.photos && listing.photos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 w-24">
                          {listing.photos.slice(0, 4).map((photo, index) => (
                            <img
                              key={photo.id}
                              src={photo.photo_url}
                              alt={`${listing.title} photo ${index + 1}`}
                              className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openLightbox(
                                listing.photos!.map(p => p.photo_url),
                                index
                              )}
                            />
                          ))}
                          {listing.photos.length > 4 && (
                            <div
                              className="w-12 h-12 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                              onClick={() => openLightbox(
                                listing.photos!.map(p => p.photo_url),
                                4
                              )}
                            >
                              +{listing.photos.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-muted rounded border flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Listing Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {listing.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">{formatPrice(listing.price)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Package className="h-3 w-3" />
                          <span>{listing.category}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{listing.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDate(listing.created_at)}</span>
                        </div>
                        {listing.photos && listing.photos.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span>📸 {listing.photos.length} photos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Badge variant="outline">{listing.condition}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Lightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onNext={nextImage}
        onPrevious={previousImage}
      />
    </div>
  )
}
