"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import MarketplaceHelperLogo from "./MarketplaceHelperLogo"

interface EditListingFormProps {
  onBack: () => void
}

export default function EditListingForm({ onBack }: EditListingFormProps) {
  const [formData, setFormData] = useState({
    title: 'Samsung 65" OLED 4K TV',
    description: 'Samsung QN65Q80T 65" OLED Smart TV, Amazing picture quality, includes remote.',
    price: "899.99",
    condition: "Used - Like New",
    sku: "SAMS-OLED-005",
    location: "Los Angeles, CA",
    email: "",
    zipCode: "90210",
    streetAddress: "",
    crossStreet: "",
    facebookCategory: "TVs",
    nextdoorCategory: "",
    craigslistCategory: "",
  })

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
          <button className="px-6 py-3 text-blue-500 border-b-2 border-blue-500 font-medium">Edit Listing</button>
          <button className="px-6 py-3 text-gray-500 hover:text-gray-700">View Listing</button>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-6 max-w-2xl">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title*</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-24 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Categories Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Categories</h3>
              <div className="flex gap-2">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  Sync Categories
                </Button>
                <Button size="sm" variant="outline">
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook category</label>
                <div className="bg-white p-2 rounded border text-sm">{formData.facebookCategory}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nextdoor category</label>
                <Select
                  value={formData.nextdoorCategory}
                  onValueChange={(value) => setFormData({ ...formData, nextdoorCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Nextdoor category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home-decor">Home decor</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Craigslist category</label>
                <Select
                  value={formData.craigslistCategory}
                  onValueChange={(value) => setFormData({ ...formData, craigslistCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Craigslist category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household-items">Household items</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <Input
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
              <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <Button className="mt-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2">📍</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Craigslist Email</label>
              <Input
                placeholder="Email for Craigslist posting"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <Input value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
            <Input
              placeholder="Street address (optional)"
              value={formData.streetAddress}
              onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cross Street</label>
            <Input
              placeholder="Cross street (optional)"
              value={formData.crossStreet}
              onChange={(e) => setFormData({ ...formData, crossStreet: e.target.value })}
            />
          </div>

          {/* Photos Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400"
                >
                  <div className="text-2xl mb-2">📷</div>
                  <div className="text-xs text-center">
                    Drag & drop
                    <br />
                    photos here
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 h-12 bg-transparent" onClick={onBack}>
              Cancel Edit
            </Button>
            <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-12">Update Listing</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
