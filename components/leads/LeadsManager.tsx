"use client";




"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useProductsStore } from '../../lib/store/productsStore';
import { Search, Phone, Globe, MessageCircle, Users, Calendar, DollarSign, Eye, Edit, Trash2, Plus, Mail, ChevronDown, ChevronUp, X, Send, Copy } from 'lucide-react';

// Pagination state
const LeadsManager = () => {
  // WhatsApp message modal state (must be inside component)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);
  // WhatsApp message templates removed
  const handleCopyPhone = () => {
    if (whatsAppLead?.phone) navigator.clipboard.writeText(whatsAppLead.phone);
  };
  // Open WhatsApp modal for a lead
  const handleOpenWhatsApp = (lead: Lead) => {
    setWhatsAppLead(lead);
    setWhatsAppMessage('');
    setShowWhatsAppModal(true);
  };

  // Send WhatsApp message (open WhatsApp web)
  const handleSendWhatsApp = () => {
    if (!whatsAppLead || !whatsAppLead.phone) return;
    // Format phone (remove non-digits, add country code if needed)
    let phone = whatsAppLead.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone; // Default to India code
    const encodedMsg = encodeURIComponent(whatsAppMessage);
    const url = `https://wa.me/${phone}?text=${encodedMsg}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };
  // Track expanded lead for dropdown details
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  // Get products from Zustand store (must be inside the component body)
  const products = useProductsStore((state) => state.products);
  // Leads state from both APIs
  type Lead = {
    id: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    product: string;
    status: string;
    value: number;
    quantity?: number;
    notes?: string;
    createdat?: string;
  };
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // ...existing code...

  // Filter and search logic (must be before totalPages, paginatedLeads, and useEffect)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Website',
    product: '',
    status: 'New',
    value: '',
    quantity: '',
    notes: ''
  });
  // Edit modal state
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editLeadData, setEditLeadData] = useState<Partial<Lead>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  // Multi-product selection state for add form
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState('');

  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtered leads with date range
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (searchTerm || statusFilter !== 'All' || sourceFilter !== 'All') {
      result = result.filter((lead) => {
        const name = (lead.name || '').toString();
        const email = (lead.email || '').toString();
        const product = (lead.product || '').toString();
        const status = (lead.status || '');
        const source = (lead.source || '');
        const matchesSearch =
          !searchTerm ||
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || status === statusFilter;
        const matchesSource = sourceFilter === 'All' || source === sourceFilter;
        return matchesSearch && matchesStatus && matchesSource;
      });
    }
    if (startDate) {
      result = result.filter(lead => lead.createdat && lead.createdat >= startDate);
    }
    if (endDate) {
      result = result.filter(lead => lead.createdat && lead.createdat <= endDate);
    }
    return result;
  }, [leads, searchTerm, statusFilter, sourceFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  // Paginated leads for current page
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredLeads, totalPages]);

  // Fetch leads from both APIs and merge
  // Fetch leads from both APIs and merge, deduplicating MySQL leads that have been synced to Supabase
  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const [manualRes, mysqlRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/leads-mysql")
      ]);
      let manualLeads: any[] = [];
      let mysqlLeads: any[] = [];
      if (manualRes.ok) {
        const data = await manualRes.json();
        manualLeads = Array.isArray(data) ? data : [];
      }
      if (mysqlRes.ok) {
        const data = await mysqlRes.json();
        mysqlLeads = Array.isArray(data) ? data : [];
      }
      // Tag all MySQL leads as Website and map quantity
      const taggedMysqlLeads = mysqlLeads.map(lead => ({
        ...lead,
        source: 'Website',
        quantity: lead.quantity !== undefined ? Number(lead.quantity) : undefined,
      }));
      // Deduplicate: if a Supabase lead exists with mysql_id matching a MySQL id, only show the Supabase one
      const supabaseMysqlIds = new Set(
        manualLeads
          .filter(l => l.mysql_id)
          .map(l => String(l.mysql_id))
      );
      const filteredMysqlLeads = taggedMysqlLeads.filter(ml => !supabaseMysqlIds.has(String(ml.id)));
      // Merge and sort by createdat (latest first)
      const allLeads = [...manualLeads, ...filteredMysqlLeads].sort((a, b) => {
        // Defensive: parse createdat as date, fallback to 0 if missing
        const dateA = a.createdat ? new Date(a.createdat).getTime() : 0;
        const dateB = b.createdat ? new Date(b.createdat).getTime() : 0;
        return dateB - dateA;
      });
      setLeads(allLeads);
    } catch (err) {
      setError("Could not load leads");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ...existing code...

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Website': return <Globe className="w-4 h-4" />;
      case 'Phone': return <Phone className="w-4 h-4" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Qualified': return 'bg-purple-100 text-purple-800';
      case 'Proposal Sent': return 'bg-orange-100 text-orange-800';
      case 'Closed Won': return 'bg-green-100 text-green-800';
      case 'Closed Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary stats
  const totalLeads = leads.length;
  const newLeads = leads.filter((lead) => lead.status === 'New').length;
  const totalValue = leads.reduce((sum, lead) => sum + (typeof lead.value === 'number' ? lead.value : 0), 0);
  const conversionRate = totalLeads > 0 ? ((leads.filter((lead) => lead.status === 'Closed Won').length / totalLeads) * 100).toFixed(1) : 0;

  // Handle adding new lead (Supabase DB)
  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const leadToAdd = {
        ...newLead,
        value: parseFloat(newLead.value) || 0,
        quantity: newLead.quantity ? parseInt(newLead.quantity) : 1,
        createdat: new Date().toISOString().split('T')[0]
      };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadToAdd)
      });
      if (!res.ok) throw new Error("Failed to add lead");
      await fetchLeads();
      setNewLead({
        name: '',
        email: '',
        phone: '',
        source: 'Website',
        product: '',
        status: 'New',
        value: '',
        quantity: '',
        notes: ''
      });
      setShowAddForm(false);
    } catch (err) {
      setError("Could not add lead");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewLead(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle product selection (add more products)
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value && !selectedProducts.includes(value)) {
      const updated = [...selectedProducts, value];
      setSelectedProducts(updated);
      setNewLead(prev => ({
        ...prev,
        product: updated.concat(customProduct ? [customProduct] : []).join(';')
      }));
    }
    e.target.value = '';
  };

  // Remove a selected product
  const handleRemoveProduct = (prod: string) => {
    const updated = selectedProducts.filter(p => p !== prod);
    setSelectedProducts(updated);
    setNewLead(prev => ({
      ...prev,
      product: updated.concat(customProduct ? [customProduct] : []).join(';')
    }));
  };

  // Handle custom product input
  const handleCustomProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomProduct(e.target.value);
    setNewLead(prev => ({
      ...prev,
      product: selectedProducts.concat(e.target.value ? [e.target.value] : []).join(';')
    }));
  };

  // View Lead Modal state
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const handleViewLead = (lead: Lead) => {
    setViewLead(lead);
  };

  // Delete lead via API (Supabase DB)
  const handleDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete lead ${lead.name}?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id })
      });
      if (!res.ok) throw new Error("Failed to delete lead");
      await fetchLeads();
    } catch (err) {
      setError("Could not delete lead");
    } finally {
      setLoading(false);
    }
  };

  // Helper: check if id is a UUID (Supabase) or numeric (MySQL)
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  // Handle status change for all leads: if MySQL, sync to Supabase first
  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    setLoading(true);
    setError("");
    try {
      // If not UUID, create in Supabase first, then update status on Supabase record only
      if (!isUUID(lead.id)) {
        // Remove 'id' from payload, send 'mysql_id' instead
        const { id, ...rest } = lead;
        const createRes = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...rest,
            status: newStatus,
            mysql_id: id // store MySQL id for reference
          })
        });
        if (!createRes.ok) throw new Error("Failed to sync MySQL lead to Supabase");
        const created = await createRes.json();
        // After creation, update the local leads state to use the new Supabase record
        setLeads(prev => {
          // Remove the MySQL lead and add the Supabase one
          const filtered = prev.filter(l => String(l.id) !== String(id));
          return [created, ...filtered];
        });
      } else {
        // Already in Supabase, just update status
        const res = await fetch("/api/leads", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: lead.id, status: newStatus })
        });
        if (!res.ok) throw new Error("Failed to update status");
        // Optionally, update the local state for instant feedback
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
      }
      await fetchLeads();
    } catch (err) {
      setError("Could not update status");
    } finally {
      setLoading(false);
    }
  };

  // Start editing a lead (open modal)
  const handleEditLead = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditLeadData({ ...lead });
    setShowEditModal(true);
  };

  // Handle edit input change
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditLeadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Replace handleEditInputChange and add handleEditTextareaChange
  const handleEditTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditLeadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save edited lead (for all leads, including MySQL leads, always update via Supabase DB)
  const handleSaveEdit = async () => {
    setLoading(true);
    setError("");
    try {
      let payload = { ...editLeadData };
      if (payload.value !== undefined) {
        payload.value = parseFloat(payload.value as any) || 0;
      }
      if (payload.id && !isUUID(payload.id as string)) {
        // Remove 'id' from payload, send 'mysql_id' instead
        const { id, ...rest } = payload;
        const createRes = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...rest,
            mysql_id: id
          })
        });
        if (!createRes.ok) throw new Error("Failed to sync MySQL lead to Supabase");
        const created = await createRes.json();
        // Replace the MySQL lead in local state with the new Supabase record
        setLeads(prev => {
          const filtered = prev.filter(l => String(l.id) !== String(id));
          return [created, ...filtered];
        });
      } else {
        // Already in Supabase, just update
        const res = await fetch("/api/leads", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update lead");
        setLeads(prev => prev.map(l => l.id === payload.id ? { ...l, ...payload } : l));
      }
      setEditingLeadId(null);
      setEditLeadData({});
      setShowEditModal(false);
      await fetchLeads();
    } catch (err) {
      setError("Could not update lead");
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingLeadId(null);
    setEditLeadData({});
    setShowEditModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-4">
      <div className="max-w-7xl mx-auto px-0 sm:px-1 md:px-2">
        {loading && <div className="text-center text-blue-600 py-8">Loading leads...</div>}
        {error && <div className="text-center text-red-600 py-2">{error}</div>}
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
              <p className="text-gray-600 mt-2">Track and manage your sales leads from all channels</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-4 h-4" />
                {showAddForm ? 'Cancel' : 'Add Lead'}
              </button>
            </div>
          </div>

          {/* Dropdown Accordion Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-900">Insights</span>
                <span className="text-sm text-gray-500">
                  ({totalLeads} leads, {totalLeads === 0 ? '-' : `₹${totalValue.toLocaleString()}`} total value)
                </span>
              </div>
              {showInsights ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {showInsights && (
              <div className="border-t border-gray-200 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Leads</p>
                      <p className="text-lg font-bold text-gray-900">{totalLeads}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">New Leads</p>
                      <p className="text-lg font-bold text-gray-900">{newLeads}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-lg font-bold text-gray-900">{totalLeads === 0 ? '-' : `₹${totalValue.toLocaleString()}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conversion</p>
                      <p className="text-lg font-bold text-gray-900">{conversionRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Inline Add Lead Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">Add New Lead</h3>
            <form onSubmit={handleAddLead}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newLead.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newLead.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Email"
                  />
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={newLead.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone"
                  />
                </div>
                {/* Source */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="source"
                    value={newLead.source}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Website">Website</option>
                    <option value="Phone">Phone</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {/* Product(s) */}
                <div className="md:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Product(s)
                  </label>
                  <ProductSearchSelect
                    products={products}
                    selectedProducts={selectedProducts}
                    onSelect={productTitle => {
                      if (!selectedProducts.includes(productTitle)) {
                        const updated = [...selectedProducts, productTitle];
                        setSelectedProducts(updated);
                        setNewLead(prev => ({
                          ...prev,
                          product: updated.join(';')
                        }));
                      }
                    }}
                    onCustomAdd={customTitle => {
                      if (!selectedProducts.includes(customTitle)) {
                        const updated = [...selectedProducts, customTitle];
                        setSelectedProducts(updated);
                        setNewLead(prev => ({
                          ...prev,
                          product: updated.join(';')
                        }));
                      }
                    }}
                    onRemove={handleRemoveProduct}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Separate multiple products with ;
                  </div>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={newLead.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>
                {/* Value */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Value (₹)
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={newLead.value}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={newLead.quantity}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
                {/* Notes */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    name="notes"
                    value={newLead.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Responsive Search, Filters, and Date Range */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-3 md:p-4 mb-4 sm:mb-5 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-2 w-full">
            {/* Search */}
            <div className="flex-1 min-w-0 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-xs text-gray-700 whitespace-nowrap">Date:</label>
              <input
                type="date"
                value={startDate || ''}
                onChange={e => setStartDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs w-full md:w-auto"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={endDate || ''}
                onChange={e => setEndDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs w-full md:w-auto"
              />
              {(startDate || endDate) && (
                <button
                  className="ml-1 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Status Filter */}
            <div className="w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full md:w-24"
              >
                <option value="All">All Status</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal Sent">Proposal</option>
                <option value="Closed Won">Won</option>
                <option value="Closed Lost">Lost</option>
              </select>
            </div>
            {/* Source Filter */}
            <div className="w-full md:w-auto">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full md:w-24"
              >
                <option value="All">All Source</option>
                <option value="Website">Website</option>
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table - Responsive, Mobile Scrollable */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 my-4 sm:my-6 md:my-8 overflow-x-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50">
          <div className="w-full min-w-[420px] sm:min-w-[600px] md:min-w-[900px] overflow-x-auto">
            <table className="w-full text-base leading-7">
              <thead className="bg-blue-100 border-b border-blue-200">
                <tr>
                  <th className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base whitespace-nowrap">Lead</th>
                  <th className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base whitespace-nowrap">Source</th>
                  <th className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base w-[90px] sm:w-[120px] md:w-[200px] whitespace-nowrap">Product</th>
                  <th className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base whitespace-nowrap">Qty</th>
                  <th className="px-1 md:px-1 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base w-6 sm:w-10 md:w-12 whitespace-nowrap">Status</th>
                  <th className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base w-[40px] sm:w-[80px] md:w-[160px] whitespace-nowrap">Notes</th>
                  <th className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base whitespace-nowrap">Value</th>
                  <th className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base whitespace-nowrap">Date</th>
                  <th className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 text-left font-bold text-blue-900 uppercase tracking-wider text-xs sm:text-base whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-50">
                {paginatedLeads.map((lead: any) => {
                  const products = lead.product
                    ? lead.product.split(';').filter((prod: string) => prod.trim().length > 0)
                    : [];
                  const displayProducts = products.slice(0, 2);
                  const moreCount = products.length - 2;
                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        className={`hover:bg-blue-100 transition-colors group cursor-pointer ${expandedLeadId === lead.id ? 'bg-blue-100' : ''}`}
                        onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                        style={{ minHeight: '48px', fontSize: '0.98rem' }}
                      >
                        <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 md:py-3 align-top whitespace-nowrap max-w-[70px] sm:max-w-[120px] md:max-w-[180px]">
                          <div className="truncate">
                            <div className="text-xs sm:text-base md:text-lg font-bold text-gray-900 truncate">{lead.name}</div>
                            <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1 truncate">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1 truncate">
                              <Phone className="w-4 h-4" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 align-top">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(lead.source)}
                            <span className="text-[10px] sm:text-xs md:text-sm text-gray-900">{lead.source}</span>
                          </div>
                        </td>
                        <td className="px-1 sm:px-1 md:px-2 py-1 sm:py-1 md:py-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            {displayProducts.map((prod: string, idx: number) => (
                              <span key={idx} title={prod.trim()} className="bg-blue-50 text-blue-800 rounded px-1.5 py-0.5 text-[10px] sm:text-xs md:text-sm font-medium truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px] border border-blue-100">
                                {prod.trim()}
                              </span>
                            ))}
                            {moreCount > 0 && (
                              <span className="bg-gray-100 text-gray-600 rounded px-1 py-0.5 text-[10px] sm:text-xs font-semibold border border-gray-200">+{moreCount} more</span>
                            )}
                            {products.length === 0 && (
                              <span className="text-gray-400 italic">No product</span>
                            )}
                          </div>
                        </td>
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 align-top text-center">
                          <span className="text-[10px] sm:text-xs md:text-sm text-gray-900 font-semibold">{lead.quantity !== undefined && lead.quantity !== null ? lead.quantity : '-'}</span>
                        </td>
                        <td className="px-1 md:px-1 py-1 sm:py-2 md:py-3 align-top">
                          <select
                            value={lead.status}
                            onChange={e => handleStatusChange(lead, e.target.value)}
                            className={`inline-flex px-2 py-1 text-[10px] sm:text-xs md:text-sm font-semibold rounded-full ${getStatusColor(lead.status)} max-w-full border border-gray-200`}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Closed Won">Closed Won</option>
                            <option value="Closed Lost">Closed Lost</option>
                          </select>
                        </td>
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 align-top max-w-[40px] sm:max-w-[80px] md:max-w-[160px]">
                          {lead.notes ? (
                            <div
                              className="flex items-start gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700 font-normal whitespace-pre-line break-words"
                              title={lead.notes}
                              style={{ wordBreak: 'break-word', whiteSpace: 'pre-line', minHeight: '1.5rem' }}
                            >
                              <span className="text-base pt-0.5">📝</span>
                              <span className="block">{lead.notes}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] sm:text-xs md:text-sm text-gray-300 italic">No notes</div>
                          )}
                        </td>
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 align-top">
                          <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-900 whitespace-nowrap">₹{typeof lead.value === 'number' && !isNaN(lead.value) ? lead.value.toLocaleString() : '0'}</div>
                        </td>
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 align-top">
                          <div className="text-[10px] sm:text-xs md:text-sm text-gray-900 whitespace-nowrap">{lead.createdat ? new Date(lead.createdat).toLocaleDateString() : ''}</div>
                        </td>
                        <td className="px-1 sm:px-2 md:px-5 py-2 sm:py-3 md:py-5 align-top">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id);
                              }}
                              className="group p-1 rounded-full hover:bg-blue-50 focus:outline-none"
                              title="View lead details"
                            >
                              <Eye className={`w-5 h-5 ${expandedLeadId === lead.id ? 'text-blue-700' : 'text-blue-500'} group-hover:text-blue-700 transition-colors`} />
                            </button>
                            {lead.phone && (
                              <button
                                className="group p-1 rounded-full hover:bg-green-50 focus:outline-none"
                                title="Send WhatsApp message"
                                onClick={e => {
                                  e.stopPropagation();
                                  setTimeout(() => handleOpenWhatsApp(lead), 0);
                                }}
                              >
                                <MessageCircle className="w-5 h-5 text-green-500 group-hover:text-green-700 transition-colors" />
                              </button>
                            )}
                            <button
                              className="group p-1 rounded-full hover:bg-yellow-50 focus:outline-none"
                              title="Edit lead"
                              onClick={e => { e.stopPropagation(); handleEditLead(lead); }}
                            >
                              <Edit className="w-5 h-5 text-yellow-500 group-hover:text-yellow-700 transition-colors" />
                            </button>
                            <button
                              className={`group p-1 rounded-full hover:bg-red-50 focus:outline-none ${typeof lead.id === 'number' || /^\d+$/.test(lead.id) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                              title="Delete lead"
                              onClick={e => { if (typeof lead.id !== 'number' && !/^\d+$/.test(lead.id)) { e.stopPropagation(); handleDeleteLead(lead); } }}
                              disabled={typeof lead.id === 'number' || /^\d+$/.test(lead.id)}
                            >
                              <Trash2 className="w-5 h-5 text-red-500 group-hover:text-red-700 transition-colors" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedLeadId === lead.id && (
                        <tr>
                          <td colSpan={9} className="p-0 border-t border-blue-100">
                            <div className="w-full bg-blue-50 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] sm:text-xs md:text-base text-gray-700">
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Name</div>
                                  <div>{lead.name}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Email</div>
                                  <div>{lead.email}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Phone</div>
                                  <div>{lead.phone}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Source</div>
                                  <div>{lead.source}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Product(s)</div>
                                  <div className="flex flex-wrap gap-1">
                                    {lead.product && lead.product.split(';').filter((prod: string) => prod.trim().length > 0).length > 0 ? (
                                      lead.product.split(';').filter((prod: string) => prod.trim().length > 0).map((prod: string, idx: number) => (
                                        <span key={idx} className="bg-blue-50 text-blue-800 rounded px-2 py-0.5 text-xs font-medium border border-blue-100" title={prod.trim()}>{prod.trim()}</span>
                                      ))
                                    ) : (
                                      <span className="text-gray-400 italic">No product</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Quantity</div>
                                  <div>{lead.quantity !== undefined && lead.quantity !== null ? lead.quantity : '-'}</div>
                                  <div className="font-semibold text-gray-900 mb-1">Status</div>
                                  <div>{lead.status}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Value</div>
                                  <div>₹{typeof lead.value === 'number' && !isNaN(lead.value) ? lead.value.toLocaleString() : '0'}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 mb-1">Created</div>
                                  <div>{lead.createdat ? new Date(lead.createdat).toLocaleDateString() : ''}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="font-semibold text-gray-900 mb-1">Notes</div>
                                  <div>{lead.notes || <span className="italic text-gray-400">No notes</span>}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls - only at the bottom */}
          {totalPages > 1 && (
            <div className="w-full flex flex-wrap justify-center items-center gap-2 mt-6 overflow-x-auto pb-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 bg-white text-sm disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <div className="flex flex-wrap gap-1 max-w-full overflow-x-auto">
                {(() => {
                  const pageButtons = [];
                  let start = Math.max(1, currentPage - 2);
                  let end = Math.min(totalPages, currentPage + 2);
                  if (currentPage <= 3) {
                    start = 1;
                    end = Math.min(totalPages, 5);
                  } else if (currentPage >= totalPages - 2) {
                    start = Math.max(1, totalPages - 4);
                    end = totalPages;
                  }
                  for (let page = start; page <= end; page++) {
                    pageButtons.push(
                      <button
                        key={page}
                        className={`px-3 py-1 rounded border text-sm ${page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700'}`}
                        onClick={() => setCurrentPage(page)}
                        disabled={page === currentPage}
                      >
                        {page}
                      </button>
                    );
                  }
                  return pageButtons;
                })()}
              </div>
              <button
                className="px-3 py-1 rounded border border-gray-300 bg-white text-sm disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* WhatsApp Modal */}
        {showWhatsAppModal && whatsAppLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-red-600"
                onClick={() => setShowWhatsAppModal(false)}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Send WhatsApp Message</h2>
              <div className="mb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {whatsAppLead.name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{whatsAppLead.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{whatsAppLead.phone}</span>
                    <button className="ml-1 text-blue-500 hover:text-blue-700" onClick={() => navigator.clipboard.writeText(whatsAppLead.phone)} title="Copy phone"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={whatsAppMessage}
                  onChange={e => setWhatsAppMessage(e.target.value)}
                  placeholder="Type your message..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  onClick={() => setShowWhatsAppModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={handleSendWhatsApp}
                  type="button"
                  disabled={!whatsAppMessage.trim()}
                >
                  Send on WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Lead Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-red-600"
                onClick={handleCancelEdit}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Edit Lead</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editLeadData.name || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editLeadData.email || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editLeadData.phone || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                  <select
                    name="source"
                    value={editLeadData.source || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="Website">Website</option>
                    <option value="Phone">Phone</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                  <input
                    type="text"
                    name="product"
                    value={editLeadData.product || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    name="status"
                    value={editLeadData.status || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value (₹)</label>
                  <input
                    type="number"
                    name="value"
                    value={editLeadData.value || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={editLeadData.quantity || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={editLeadData.notes || ""}
                    onChange={handleEditTextareaChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-y min-h-[48px]"
                    rows={3}
                    placeholder="Notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        {filteredLeads.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredLeads.length} of {totalLeads} leads
          </div>
        )}
      </div>
    </div>
  );
};

function ProductSearchSelect({
  products,
  selectedProducts,
  onSelect,
  onCustomAdd,
  onRemove,
}: {
  products: any[];
  selectedProducts: string[];
  onSelect: (productTitle: string) => void;
  onCustomAdd: (customTitle: string) => void;
  onRemove: (productTitle: string) => void;
}) {
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);

  const filtered =
    products && products.length > 0
      ? products.filter(
          (product: any) =>
            !selectedProducts.includes(product.title) &&
            (!input ||
              product.title.toLowerCase().includes(input.toLowerCase()))
        )
      : [];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-1">
        {selectedProducts.map((prod, idx) => (
          <span
            key={prod + idx}
            className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full flex items-center gap-1"
          >
            {prod}
            <button
              type="button"
              className="ml-1 text-blue-500 hover:text-red-500"
              onClick={() => onRemove(prod)}
              aria-label="Remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Search or add product..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={input}
        onFocus={() => setShow(true)}
        onChange={e => setInput(e.target.value)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim() && !selectedProducts.includes(input.trim())) {
            onCustomAdd(input.trim());
            setInput('');
            setShow(false);
          }
        }}
      />
      {show && (
        <div
          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div
              className="px-3 py-2 text-xs text-gray-400 cursor-pointer"
              onMouseDown={() => {
                if (input.trim() && !selectedProducts.includes(input.trim())) {
                  onCustomAdd(input.trim());
                  setInput('');
                  setShow(false);
                }
              }}
            >
              + Add "{input.trim()}"
            </div>
          ) : (
            filtered.map((product: any, idx: number) => (
              <div
                key={product.id || product.handle || `${product.title}-${idx}`}
                className="px-3 py-2 text-sm text-gray-800 hover:bg-blue-100 cursor-pointer"
                onMouseDown={() => {
                  onSelect(product.title);
                  setInput('');
                  setShow(false);
                }}
              >
                {product.title}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default LeadsManager;