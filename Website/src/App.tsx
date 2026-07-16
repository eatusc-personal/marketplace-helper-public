import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Toaster } from '@/components/ui/toaster'

// Pages
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Listings from '@/pages/Listings'
import ListingEdit from '@/pages/ListingEdit'
import Photos from '@/pages/Photos'
import Settings from '@/pages/Settings'
import AdminDash from '@/pages/AdminDash'
import UserManagement from '@/pages/UserManagement'
import UserListings from '@/pages/UserListings'
import Layout from '@/components/Layout'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔐 App: Starting auth check')
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 App: Initial session:', session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 App: Auth state changed:', _event, session?.user?.email)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  console.log('🔐 App: Render state - loading:', loading, 'user:', user?.email)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    console.log('🔐 App: No user, showing Auth component')
    return (
      <>
        <Auth />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/new" element={<ListingEdit />} />
          <Route path="/listings/:id" element={<ListingEdit />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDash />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/users/:userId/listings" element={<UserListings />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  )
}

export default App;
