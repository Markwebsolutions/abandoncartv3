
import React, { useState, useMemo, useEffect } from 'react';


interface Record {
  id: number;
  date: string;
  customerName: string;
  mobileNumber: string;
  remark: string;
  callFor: string;
  remarks: string;
  status: string;
}
import { Search, Plus, Edit2, Trash, PhoneCall, Calendar, Users, FileText, ChevronDown, ChevronRight } from 'lucide-react';

const CallRecord = () => {
  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const [records, setRecords] = useState<Record[]>([]);
  // Fetch records from backend API on mount
  useEffect(() => {
    fetch('/api/call-records')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecords(data);
        } else {
          setRecords([]);
        }
      })
      .catch(() => setRecords([]));
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [isCustomCallFor, setIsCustomCallFor] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState(new Set());
  
  const [newRecord, setNewRecord] = useState({
    date: new Date().toLocaleDateString('en-GB'),
    customerName: '',
    mobileNumber: '',
    remark: '',
    callFor: 'New Inquiry',
    remarks: '',
    status: 'Follow-up Required'
  });
  const [editRecord, setEditRecord] = useState<Record | null>(null);

  const [customCallForOptions, setCustomCallForOptions] = useState([
    'New Inquiry',
    'Existing Customer',
    'Vinod Cookware',
    'Customer Complain'
  ]);

  const [statusOptions] = useState([
    'Follow-up Required',
    'In Progress', 
    'Closed'
  ]);

  const getCallForColor = (callFor: string | null | undefined): string => {
    const lowerCallFor = (callFor || '').toLowerCase();
    if (lowerCallFor.includes('complain')) {
      return 'bg-red-50 text-red-700 border-red-200';
    } else if (lowerCallFor.includes('inquiry') || lowerCallFor.includes('new')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (lowerCallFor.includes('existing') || lowerCallFor.includes('customer')) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (lowerCallFor.includes('vinod') || lowerCallFor.includes('cookware')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    } else {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  const getStatusColor = (status: string | null | undefined): string => {
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus.includes('closed')) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (lowerStatus.includes('progress')) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    } else if (lowerStatus.includes('follow')) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    } else {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDateStats = (date: string, records: Record[]): { total: number } => {
    const dateRecords = records.filter((r: Record) => r.date === date);
    return { total: dateRecords.length };
  };

  // Flat filtered records for pagination
  const filteredRecords = useMemo(() => {
    const safeRecords: Record[] = Array.isArray(records) ? records : [];
    let filtered: Record[] = safeRecords;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((record: Record) =>
        (record.customerName || '').toLowerCase().includes(term) ||
        (record.mobileNumber || '').toLowerCase().includes(term) ||
        (record.remark || '').toLowerCase().includes(term) ||
        (record.callFor || '').toLowerCase().includes(term) ||
        (record.remarks || '').toLowerCase().includes(term) ||
        (record.status || '').toLowerCase().includes(term)
      );
    }
    if (dateFrom) {
      filtered = filtered.filter((record: Record) => {
        const [d, m, y] = record.date.split('/');
        const recDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
        return recDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      filtered = filtered.filter((record: Record) => {
        const [d, m, y] = record.date.split('/');
        const recDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
        return recDate <= new Date(dateTo);
      });
    }
    if (statusFilter) {
      filtered = filtered.filter((record: Record) => record.status === statusFilter);
    }
    // Sort by date desc, id desc
    filtered.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      if (dateA.getTime() !== dateB.getTime()) return dateB.getTime() - dateA.getTime();
      return b.id - a.id;
    });
    return filtered;
  }, [records, searchTerm, dateFrom, dateTo, statusFilter]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Group paginated records by date for display
  const groupedRecords = useMemo(() => {
    const grouped: { [date: string]: Record[] } = {};
    paginatedRecords.forEach((record: Record) => {
      if (!grouped[record.date]) grouped[record.date] = [];
      grouped[record.date].push(record);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return (dateB as any) - (dateA as any);
    });
    const result: { [date: string]: Record[] } = {};
    sortedDates.forEach(date => {
      result[date] = grouped[date];
    });
    return result;
  }, [paginatedRecords]);

  // Insights
  const totalInProgress = records.filter(r => r.status === 'In Progress').length;
  const totalFollowup = records.filter(r => r.status === 'Follow-up Required').length;

  const toggleDateCollapse = (date: string) => {
    const newCollapsed = new Set(collapsedDates);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedDates(newCollapsed);
  };

  const handleAddRecord = async (): Promise<void> => {
    if (newRecord.mobileNumber && newRecord.remark) {
      try {
        const res = await fetch('/api/call-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord),
        });
        if (res.ok) {
          const added = await res.json();
          setRecords([...records, added]);
          if (!customCallForOptions.includes(newRecord.callFor)) {
            setCustomCallForOptions([...customCallForOptions, newRecord.callFor]);
          }
          setNewRecord({
            date: new Date().toLocaleDateString('en-GB'),
            customerName: '',
            mobileNumber: '',
            remark: '',
            callFor: 'New Inquiry',
            remarks: '',
            status: 'Follow-up Required'
          });
          setShowAddForm(false);
          setIsCustomCallFor(false);
        }
      } catch (e) {
        // handle error
      }
    }
  };

  const handleEditRecord = (record: Record): void => {
    setEditingRecordId(record.id);
    setEditRecord({ ...record });
    setIsCustomCallFor(!customCallForOptions.includes(record.callFor));
  };

  const handleUpdateRecord = async (): Promise<void> => {
    try {
      if (!editRecord) return;
      const res = await fetch('/api/call-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editRecord, id: editingRecordId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecords(records.map(record => record.id === editingRecordId ? updated : record));
        if (editRecord.callFor && !customCallForOptions.includes(editRecord.callFor)) {
          setCustomCallForOptions([...customCallForOptions, editRecord.callFor]);
        }
        setEditingRecordId(null);
        setEditRecord(null);
        setIsCustomCallFor(false);
      }
    } catch (e) {
      // handle error
    }
  };

  const handleDeleteRecord = async (id: number): Promise<void> => {
    try {
      const res = await fetch('/api/call-records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRecords(records.filter(record => record.id !== id));
      }
    } catch (e) {
      // handle error
    }
  };

  const resetForm = (): void => {
    setShowAddForm(false);
    setEditingRecordId(null);
    setEditRecord(null);
    setIsCustomCallFor(false);
    setNewRecord({
      date: new Date().toLocaleDateString('en-GB'),
      customerName: '',
      mobileNumber: '',
      remark: '',
      callFor: 'New Inquiry',
      remarks: '',
      status: 'Follow-up Required'
    });
  };

  const formatDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('/');
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Title with Add Record button on top right */}
        <div className="flex flex-row items-center justify-between mb-8 gap-4">
          <div className="flex flex-row items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center p-2 bg-white/80 rounded-lg shadow-sm h-12 w-12">
              <PhoneCall className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Call Record Manager</h1>
              <p className="text-gray-600">Comprehensive customer interaction tracking system</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Record</span>
          </button>
        </div>
        
        {/* Professional Header with Filters and Insights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 rounded-t-lg px-6 py-4" style={{backgroundColor: '#E8F5E8'}}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-nowrap items-center gap-2 md:gap-3 w-full overflow-x-auto">
                <div className="relative min-w-56">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <input
                  type="date"
                  className="w-20 px-1.5 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  placeholder="From"
                  title="From date"
                />
                <input
                  type="date"
                  className="w-20 px-1.5 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  placeholder="To"
                  title="To date"
                />
                <select
                  className="w-36 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {/* <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Record</span>
                </button> */}
                {/* Insights in same line */}
                <div className="flex items-center bg-blue-50 border border-blue-200 rounded-md px-6 py-2 text-blue-800 text-sm font-semibold ml-2 min-w-[180px] justify-center">
                  In Progress: <span className="ml-2 font-bold">{totalInProgress}</span>
                </div>
                <div className="flex items-center bg-orange-50 border border-orange-200 rounded-md px-6 py-2 text-orange-800 text-sm font-semibold ml-2 min-w-[180px] justify-center whitespace-nowrap">
                  Follow-up Required: <span className="ml-2 font-bold">{totalFollowup}</span>
                </div>
                {/* Add Record button moved to top right, removed from here */}

              </div>
            </div>
          </div>
        </div>

        {/* Professional Add Form (not edit) */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 border-b border-gray-200 rounded-t-lg px-6 py-3">
              <h3 className="text-md font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Add New Call Record</span>
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={e => { e.preventDefault(); handleAddRecord(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="text"
                      value={newRecord.date}
                      onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={newRecord.customerName}
                      onChange={(e) => setNewRecord({...newRecord, customerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRecord.mobileNumber}
                      onChange={(e) => setNewRecord({...newRecord, mobileNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Phone number"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Call Detail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRecord.remark}
                      onChange={(e) => setNewRecord({...newRecord, remark: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter call details"
                      required
                    />
                  </div>
                  <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Call Purpose</label>
                    <div className="flex flex-row items-center gap-4 mb-2">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="callForTypeAdd"
                          checked={!isCustomCallFor}
                          onChange={() => {
                            setIsCustomCallFor(false);
                            setNewRecord({...newRecord, callFor: 'New Inquiry'});
                          }}
                          className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">Preset</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="callForTypeAdd"
                          checked={isCustomCallFor}
                          onChange={() => {
                            setIsCustomCallFor(true);
                            setNewRecord({...newRecord, callFor: ''});
                          }}
                          className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">Custom</span>
                      </label>
                    </div>
                    {!isCustomCallFor ? (
                      <select
                        value={newRecord.callFor}
                        onChange={(e) => setNewRecord({...newRecord, callFor: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        {customCallForOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={newRecord.callFor}
                        onChange={(e) => setNewRecord({...newRecord, callFor: e.target.value})}
                        placeholder="Enter custom purpose"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    )}
                  </div>
                  <div className="flex flex-row gap-x-4 col-span-1 md:col-span-2 lg:col-span-2">
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                      <textarea
                        value={newRecord.remarks}
                        onChange={(e) => setNewRecord({...newRecord, remarks: e.target.value})}
                        className="w-full px-3 py-2 mt-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                        placeholder="Add follow-up notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={newRecord.status}
                      onChange={(e) => setNewRecord({...newRecord, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {statusOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
                  >
                    Add Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Professional Records Display with Pagination */}
        <div className="space-y-4">
          {Object.entries(groupedRecords).map(([date, dateRecords]) => {
            const stats = getDateStats(date, dateRecords);
            const isCollapsed = collapsedDates.has(date);
            return (
              <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Clean Date Header */}
                <div 
                  className="border-b border-gray-200 px-6 py-3 cursor-pointer hover:opacity-90 transition-all"
                  style={{backgroundColor: '#F0E8F7'}}
                  onClick={() => toggleDateCollapse(date)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-500">
                        {isCollapsed ? 
                          <ChevronRight className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </div>
                      <div>
                        <h3 className="text-md font-semibold text-gray-900">{formatDate(date)}</h3>
                        <p className="text-gray-600 text-xs">{date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
                      <div className="text-gray-600 text-xs">Records</div>
                    </div>
                  </div>
                </div>
                {/* Clean Records Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-1/6" />
                        <col className="w-1/5" />
                        <col className="w-1/8" />
                        <col className="w-1/6" />
                        <col className="w-1/8" />
                        <col className="w-1/10" />
                      </colgroup>
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer Information
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Call Details
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purpose
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Follow-up Notes
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dateRecords.map((record) => (
                          <React.Fragment key={record.id}>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-start space-x-2">
                                  <div className="p-1.5 bg-gray-100 rounded-md flex-shrink-0 mt-0.5">
                                    <Users className="w-3.5 h-3.5 text-gray-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 break-words">
                                      {record.customerName || 'Unknown Customer'}
                                    </div>
                                    <div className="text-sm text-gray-500 font-mono break-all">
                                      {record.mobileNumber}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-start space-x-2">
                                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm text-gray-700 break-words leading-relaxed">
                                    {record.remark}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getCallForColor(record.callFor)} break-words`}>
                                  {record.callFor}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="text-sm text-gray-700 break-words leading-relaxed">
                                  {record.remarks || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusColor(record.status)}`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-start justify-center space-x-1">
                                  <button
                                    onClick={() => handleEditRecord(record)}
                                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit Record"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Record"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {editingRecordId === record.id && (
                              <tr>
                                <td colSpan={6} className="bg-gray-50 px-4 py-4">
                                  {/* ...existing code for edit form... */}
                                  <form onSubmit={e => { e.preventDefault(); handleUpdateRecord(); }}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                                      {/* ...existing code for edit fields... */}
                                      <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                          type="text"
                                          value={editRecord ? editRecord.date : ''}
                                          onChange={(e) => editRecord && setEditRecord({ ...editRecord, date: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                        <input
                                          type="text"
                                          value={editRecord ? editRecord.customerName : ''}
                                          onChange={(e) => editRecord && setEditRecord({ ...editRecord, customerName: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          placeholder="Enter customer name"
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Mobile Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={editRecord ? editRecord.mobileNumber : ''}
                                          onChange={(e) => editRecord && setEditRecord({ ...editRecord, mobileNumber: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          placeholder="Phone number"
                                          required
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Call Detail <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={editRecord ? editRecord.remark : ''}
                                          onChange={(e) => editRecord && setEditRecord({ ...editRecord, remark: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          placeholder="Enter call details"
                                          required
                                        />
                                      </div>
                                      <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Call Purpose</label>
                                        <div className="flex flex-row items-center gap-4 mb-2">
                                          <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                              type="radio"
                                              name={`callForTypeEdit${record.id}`}
                                              checked={!isCustomCallFor}
                                              onChange={() => {
                                                setIsCustomCallFor(false);
                                              editRecord && setEditRecord({ ...editRecord, callFor: 'New Inquiry' });
                                              }}
                                              className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-700">Preset</span>
                                          </label>
                                          <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                              type="radio"
                                              name={`callForTypeEdit${record.id}`}
                                              checked={isCustomCallFor}
                                              onChange={() => {
                                                setIsCustomCallFor(true);
                                              editRecord && setEditRecord({ ...editRecord, callFor: '' });
                                              }}
                                              className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-700">Custom</span>
                                          </label>
                                        </div>
                                        {!isCustomCallFor ? (
                                          <select
                                            value={editRecord ? editRecord.callFor : ''}
                                            onChange={(e) => {
                                              if (editRecord) {
                                                setEditRecord({
                                                  ...editRecord,
                                                  callFor: e.target.value,
                                                  id: editRecord.id,
                                                  date: editRecord.date,
                                                  customerName: editRecord.customerName,
                                                  mobileNumber: editRecord.mobileNumber,
                                                  remark: editRecord.remark,
                                                  remarks: editRecord.remarks,
                                                  status: editRecord.status
                                                });
                                              }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          >
                                            {customCallForOptions.map(option => (
                                              <option key={option} value={option}>{option}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            type="text"
                                            value={editRecord.callFor}
                                            onChange={(e) => setEditRecord({...editRecord, callFor: e.target.value})}
                                            placeholder="Enter custom purpose"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          />
                                        )}
                                      </div>
                                      <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-2 gap-x-4">
                                        <div className="flex flex-row gap-x-4 w-full">
                                          <div className="flex-1 flex flex-col">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                                            <textarea
                                              value={editRecord ? editRecord.remarks : ''}
                                              onChange={(e) => editRecord && setEditRecord({ ...editRecord, remarks: e.target.value })}
                                              className="w-full px-3 py-2 mt-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                              placeholder="Add follow-up notes..."
                                              rows={2}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                          value={editRecord ? editRecord.status : ''}
                                          onChange={(e) => editRecord && setEditRecord({ ...editRecord, status: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                          {statusOptions.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                                      <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
                                      >
                                        Update Record
                                      </button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {/* Pagination Controls */}
          {filteredRecords.length > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="text-sm font-medium">Page {page} of {totalPages}</span>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
          {Object.keys(groupedRecords).length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <PhoneCall className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No call records found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Start by adding your first call record.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                >
                  Add First Record
                </button>
              )}
            </div>
          )}
        </div>

        {/* Professional Footer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {Object.values(groupedRecords).flat().length} of {records.length} records
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallRecord;