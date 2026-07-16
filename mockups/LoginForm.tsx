"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

interface LoginFormProps {
  onLogin: () => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        <img src="/images/login-page-top.png" alt="Marketplace Helper Header" className="w-full h-auto rounded-t-lg" />
      </div>

      {/* Login Form */}
      <div className="px-6 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-600">Sign-in to access your marketplace listings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 bg-gray-100 border-0 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-gray-100 border-0 rounded-lg"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-password"
              checked={showPassword}
              onCheckedChange={(checked) => setShowPassword(checked as boolean)}
            />
            <label htmlFor="show-password" className="text-sm text-gray-600">
              Show Password
            </label>
          </div>

          <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg">
            Login
          </Button>
        </form>

        <div className="text-center mt-6 space-y-4">
          <a href="#" className="text-blue-500 hover:text-blue-600">
            Forgot <span className="text-blue-400">Password</span>?
          </a>

          <div className="text-gray-600">
            Don't have an account?{" "}
            <a href="#" className="text-blue-400 hover:text-blue-500">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
