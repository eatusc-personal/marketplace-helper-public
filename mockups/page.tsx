"use client"

import { useState } from "react"
import LoginForm from "@/components/LoginForm"
import CreateListingForm from "@/components/CreateListingForm"
import EditListingForm from "@/components/EditListingForm"
import ViewListings from "@/components/ViewListings"

export default function MarketplaceHelperApp() {
  const [currentView, setCurrentView] = useState<"login" | "create" | "edit" | "view">("login")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
    setCurrentView("view")
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === "create" && <CreateListingForm onBack={() => setCurrentView("view")} />}
      {currentView === "edit" && <EditListingForm onBack={() => setCurrentView("view")} />}
      {currentView === "view" && (
        <ViewListings onCreateListing={() => setCurrentView("create")} onEditListing={() => setCurrentView("edit")} />
      )}
    </div>
  )
}
