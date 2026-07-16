import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { ListingPhoto } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Image,
  Upload,
  GripVertical,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PhotoManagerProps {
  listingId?: string
  photos: ListingPhoto[]
  onPhotosChange: (photos: ListingPhoto[]) => void
}

export default function PhotoManager({ listingId, photos, onPhotosChange }: PhotoManagerProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!listingId) {
      toast({
        title: 'Error',
        description: 'Please save the listing first before uploading photos',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    const newPhotos: ListingPhoto[] = []

    try {
      for (const file of acceptedFiles) {
        // Generate unique filename
        const timestamp = Date.now()
        const fileName = `${timestamp}-${file.name}`
        const filePath = `photos/${fileName}`

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('mb_photos')
          .upload(filePath, file)

        if (error) throw error

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('mb_photos')
          .getPublicUrl(filePath)

        // Create photo record in database
        const nextPosition = photos.length + newPhotos.length
        const { data: photoData, error: photoError } = await supabase
          .from('mb_photos')
          .insert({
            listing_id: listingId,
            photo_url: urlData.publicUrl,
            position: nextPosition
          })
          .select()
          .single()

        if (photoError) throw photoError

        newPhotos.push(photoData)
      }

      // Update photos list
      const updatedPhotos = [...photos, ...newPhotos]
      onPhotosChange(updatedPhotos)

      toast({
        title: 'Success',
        description: `Uploaded ${acceptedFiles.length} photo${acceptedFiles.length > 1 ? 's' : ''}`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload photos',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }, [listingId, photos, onPhotosChange, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true
  })

  const deletePhoto = async (photoId: string, index: number) => {
    try {
      const photo = photos[index]

      // Delete from storage
      const filePath = photo.photo_url.split('/').pop()
      if (filePath) {
        await supabase.storage
          .from('mb_photos')
          .remove([`photos/${filePath}`])
      }

      // Delete from database
      const { error } = await supabase
        .from('mb_photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      // Update local state
      const updatedPhotos = photos.filter((_, i) => i !== index)
      onPhotosChange(updatedPhotos)

      toast({
        title: 'Success',
        description: 'Photo deleted successfully',
      })
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete photo',
        variant: 'destructive',
      })
    }
  }

  const reorderPhotos = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const updatedPhotos = [...photos]
    const [movedPhoto] = updatedPhotos.splice(fromIndex, 1)
    updatedPhotos.splice(toIndex, 0, movedPhoto)

    // Update positions
    const photoUpdates = updatedPhotos.map((photo, index) => ({
      id: photo.id,
      position: index
    }))

    try {
      // Update all positions in database
      for (const update of photoUpdates) {
        await supabase
          .from('mb_photos')
          .update({ position: update.position })
          .eq('id', update.id)
      }

      onPhotosChange(updatedPhotos)
    } catch (error) {
      console.error('Reorder error:', error)
      toast({
        title: 'Error',
        description: 'Failed to reorder photos',
        variant: 'destructive',
      })
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const draggedElement = e.currentTarget.parentElement
    if (draggedElement) {
      const rect = draggedElement.getBoundingClientRect()
      const midY = rect.top + rect.height / 2

      if (e.clientY < midY && draggedIndex > index) {
        reorderPhotos(draggedIndex, index)
        setDraggedIndex(index)
      } else if (e.clientY > midY && draggedIndex < index) {
        reorderPhotos(draggedIndex, index)
        setDraggedIndex(index)
      }
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Photos ({photos.length})</h3>
        <div className="text-sm text-gray-500">
          Drag & drop to reorder, click to delete
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop photos here...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">
                  Drag & drop photos here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, GIF, WebP
                </p>
              </div>
            )}
            {uploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Uploading...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card
              key={photo.id}
              className="relative group cursor-move"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={photo.photo_url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />

                  {/* Drag Handle */}
                  <div className="absolute top-2 left-2 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deletePhoto(photo.id, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Position Badge */}
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No photos yet. Upload some to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
