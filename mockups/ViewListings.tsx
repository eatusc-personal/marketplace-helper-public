"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import MarketplaceHelperLogo from "./MarketplaceHelperLogo"

interface ViewListingsProps {
  onCreateListing: () => void
  onEditListing: () => void
}

export default function ViewListings({ onCreateListing, onEditListing }: ViewListingsProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MarketplaceHelperLogo className="w-10 h-10" />
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-500">Your email here</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <div className="flex">
          <button className="px-6 py-3 text-gray-500 hover:text-gray-700" onClick={onCreateListing}>
            Create Listing
          </button>
          <button className="px-6 py-3 text-blue-500 border-b-2 border-blue-500 font-medium">View Listing</button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-700">Your listings</h2>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6">🔄 Refresh</Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button variant="outline" size="sm" className="w-10 h-10 rounded-full bg-teal-500 text-white">
            ◀
          </Button>
          <span className="text-sm text-gray-600">1 / 12</span>
          <Button variant="outline" size="sm" className="w-10 h-10 rounded-full bg-teal-500 text-white">
            ▶
          </Button>
        </div>

        {/* Listing Card */}
        <div className="border rounded-lg p-6 mb-6">
          <h3 className="text-xl font-medium text-blue-500 mb-2">
            4oz Amber Glass Bottles with Caps -Bulk Lot (160 pcs)
          </h3>
          <div className="text-2xl font-bold text-orange-500 mb-2">$40.00</div>
          <p className="text-gray-600 mb-4">
            Selling a full carton of 160 brand-new 4oz (120ml amber Boston round bottles.
          </p>

          {/* Status Checkmarks */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-600">Never used - still in original packaging</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm">Facebook: Kitchen & Bath</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm">Nextdoor: Home decor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm">Craigslist: Household items</span>
              <span className="ml-auto bg-gray-100 px-2 py-1 rounded text-xs">New</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm">Tustin, CA</span>
            </div>
          </div>

          {/* Images */}
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
            <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
          </div>

          <div className="text-sm text-gray-500 mb-4">Created: Aug 21, 2025, 11:16AM</div>

          {/* Marketplace Buttons */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Post to your marketplaces below</p>
            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">facebook</Button>
              <Button className="bg-green-500 hover:bg-green-600 text-white px-6">nextdoor</Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6">craigslist</Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={onEditListing}>
              ✏️
            </Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">🗑️</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
