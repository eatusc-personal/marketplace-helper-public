import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ListingPhoto, Listing, PhotoWithListing } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Image,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Package,
  Calendar
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Photos() {
  const { toast } = useToast()
  const [photos, setPhotos] = useState<PhotoWithListing[]>([])
  const [loading, setLoading] = useState(true)
  const [groupByListing, setGroupByListing] = useState(true)

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      console.log('📸 Starting photo fetch...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('👤 Photos - Current user:', user)
      console.log('❌ Photos - User error:', userError)

      if (!user) {
        console.log('❌ No user found for photos')
        return
      }

      console.log('🔍 Fetching photos for user:', user.id)
      const { data, error } = await supabase
        .from('mb_photos')
        .select(`
          *,
          listing:mb_listings(*)
        `)
        .eq('listing.user_id', user.id)
        .order('created_at', { ascending: true })

      console.log('📸 Photos query result:', { data, error })
      console.log('📸 Photos count:', data?.length || 0)

      if (error) throw error

      setPhotos(data || [])
    } catch (error) {
      console.error('💥 Error fetching photos:', error)
      toast({
        title: 'Error',
        description: 'Failed to load photos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('mb_photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      setPhotos(photos.filter(p => p.id !== photoId))

      toast({
        title: 'Success',
        description: 'Photo deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete photo',
        variant: 'destructive',
      })
    }
  }

  const groupedPhotos = photos.reduce((acc, photo) => {
    const listingId = photo.listing_id
    if (!acc[listingId]) {
      acc[listingId] = {
        listing: photo.listing,
        photos: []
      }
    }
    acc[listingId].photos.push(photo)
    return acc
  }, {} as Record<string, { listing: Listing; photos: ListingPhoto[] }>)

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
        <div className="text-center">Loading photos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Photos</h1>
        <div className="flex items-center space-x-4">
          <Button
            variant={groupByListing ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupByListing(true)}
          >
            Group by Listing
          </Button>
          <Button
            variant={!groupByListing ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupByListing(false)}
          >
            All Photos
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{photos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listings with Photos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(groupedPhotos).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Photos per Listing</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(groupedPhotos).length > 0
                ? (photos.length / Object.keys(groupedPhotos).length).toFixed(1)
                : '0'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {groupByListing ? (
        /* Grouped by Listing */
        <div className="space-y-6">
          {Object.keys(groupedPhotos).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
                <p className="text-gray-500 mb-4">Add photos to your listings to see them here</p>
                <Button asChild>
                  <Link to="/listings">
                    View Listings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.values(groupedPhotos).map(({ listing, photos: listingPhotos }) => (
              <Card key={listing?.id || 'orphaned'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{listing?.title || 'Orphaned Photos'}</CardTitle>
                      <CardDescription>
                        {listingPhotos.length} photo{listingPhotos.length !== 1 ? 's' : ''} •
                        {listing?.created_at ? `Created ${formatDate(listing.created_at)}` : 'No listing data'}
                      </CardDescription>
                    </div>
                    {listing?.id && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/listings/${listing.id}`}>
                          Edit Listing
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {listingPhotos.map((photo, index) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.photo_url}
                          alt={`${listing.title} - Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a href={photo.photo_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* All Photos Grid */
        <Card>
          <CardHeader>
            <CardTitle>All Photos</CardTitle>
            <CardDescription>All photos across all listings</CardDescription>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <div className="text-center py-8">
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
                <p className="text-gray-500 mb-4">Add photos to your listings to see them here</p>
                <Button asChild>
                  <Link to="/listings">
                    View Listings
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.photo_url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/listings/${photo.listing_id}`}>
                                <Package className="h-4 w-4 mr-2" />
                                View Listing
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={photo.photo_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {photo.listing.title.substring(0, 15)}...
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
