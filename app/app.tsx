"use client"
import { useState, useEffect } from "react"
import AbandonedCartManager from "@/components/abandoned-cart/AbandonedCartManager"
import CallRecord from "@/components/CallRecord"
import ProductsManager from "@/components/products/ProductsManager"
// TODO: Create this component in the appropriate directory
import LeadsManager from "@/components/leads/LeadsManager"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ShoppingBag, Loader2, PhoneCall } from "lucide-react"

const NAV = [
  { key: "abandoned", label: "Abandoned Carts", icon: <ShoppingCart className="w-5 h-5 mr-2" /> },
  { key: "callrecord", label: "Call Records", icon: <PhoneCall className="w-5 h-5 mr-2" /> },
  { key: "leads", label: "Leads", icon: <Loader2 className="w-5 h-5 mr-2" /> },
  { key: "products", label: "Products", icon: <ShoppingBag className="w-5 h-5 mr-2" /> },
]

// Loading Screen Component


export default function App() {
  const [tab, setTab] = useState("abandoned")

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 flex items-center justify-center">
          <img src="https://cdn.shopify.com/s/files/1/0576/7459/6542/files/vinod-logo1.png?v=1695027396" alt="Vinod Logo" className="h-12 w-auto" />
        </div>
        <nav className="flex-1">
          {NAV.map((item) => (
            <Button
              key={item.key}
              variant={tab === item.key ? "default" : "ghost"}
              className={`w-full justify-start px-6 py-4 text-lg rounded-none ${tab === item.key ? "font-bold" : ""}`}
              onClick={() => setTab(item.key)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {tab === "abandoned" && <AbandonedCartManager />}
        {tab === "callrecord" && <CallRecord />}
        {tab === "leads" && <LeadsManager />}
        {tab === "products" && <ProductsManager />}
      </main>
    </div>
  )
}