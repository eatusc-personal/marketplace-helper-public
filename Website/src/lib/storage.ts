import { supabase } from './supabase'

export const uploadImage = async (file: File, listingId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${listingId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(fileName, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(fileName)

  return publicUrl
}

export const deleteImage = async (photoUrl: string): Promise<void> => {
  const path = photoUrl.split('/').slice(-2).join('/')

  const { error } = await supabase.storage
    .from('listing-photos')
    .remove([path])

  if (error) throw error
}

export const getImageUrl = (path: string): string => {
  const { data: { publicUrl } } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(path)

  return publicUrl
}
