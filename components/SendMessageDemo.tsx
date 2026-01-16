import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchTemplates, Template as DBTemplate } from "@/lib/templatesApi";

// Dummy customer/cart data for demo (replace with real data source)
const demoCustomers = [
  {
    id: 1,
    name: "John Doe",
    product: "iPhone",
    company: "Your Store",
    amount: "$299",
    order_id: "#12345",
    tracking_url: "track.yourstore.com/12345",
    checkout_url: "https://checkout.shopify.com/real-customer-1"
  },
  {
    id: 2,
    name: "Jane Smith",
    product: "MacBook",
    company: "Your Store",
    amount: "$999",
    order_id: "#54321",
    tracking_url: "track.yourstore.com/54321",
    checkout_url: "https://checkout.shopify.com/real-customer-2"
  }
];

export default function SendMessageDemo() {
  const [templates, setTemplates] = useState<DBTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [filledMessage, setFilledMessage] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  const handleSend = async () => {
    if (!selectedTemplate || !selectedCustomer) return;
    setLoading(true);
    const customer = demoCustomers.find(c => c.id === selectedCustomer);
    if (!customer) return;
    const { id, ...variables } = customer;
    const res = await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selectedTemplate, variables })
    });
    const data = await res.json();
    setFilledMessage(data.message || "");
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded-xl border mt-8">
      <h2 className="text-xl font-bold mb-4">Send Message Demo</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Select Template</label>
        <Select value={selectedTemplate?.toString() || ""} onValueChange={v => setSelectedTemplate(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map(tpl => (
              <SelectItem key={tpl.id} value={tpl.id.toString()}>{tpl.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Select Customer/Cart</label>
        <Select value={selectedCustomer?.toString() || ""} onValueChange={v => setSelectedCustomer(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a customer/cart" />
          </SelectTrigger>
          <SelectContent>
            {demoCustomers.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.product})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSend} disabled={!selectedTemplate || !selectedCustomer || loading} className="mb-4">
        {loading ? "Filling..." : "Fill & Show Message"}
      </Button>
      {filledMessage && (
        <div className="bg-gray-50 rounded-lg p-4 border mt-4">
          <div className="font-medium mb-2">Filled Message:</div>
          <Textarea value={filledMessage} readOnly rows={6} className="resize-none" />
        </div>
      )}
    </div>
  );
}
