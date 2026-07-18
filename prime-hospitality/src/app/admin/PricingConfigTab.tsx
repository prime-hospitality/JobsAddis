"use client";

import React, { useState, useEffect } from "react";
import { getPricingConfig, updatePricingConfig } from "./actions";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

export default function PricingConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    standardPackages: [
      { label: 'Three Days Package', price: '1,983.75' },
      { label: 'Five Days Package', price: '2,645.00' },
      { label: 'One Week Package', price: '3,306.25' },
      { label: 'Two Weeks Package', price: '5,290.00' },
      { label: 'One Month Package', price: '7,273.75' },
      { label: "Three Month's Package", price: '16,531.25' }
    ],
    premiumPackages: [
      { label: "Six Month's Membership", price: '25,127.50' },
      { label: 'One Year Membership', price: '46,287.50' }
    ],
    addOns: [
      { label: 'Pin Your Vacancy', price: '1,000 / Day' }
    ],
    bankDetails: {
      companyName: 'Prime Hospitality Business Group PLC',
      bankName: 'Awash Bank',
      accountNumber: '013041457659800'
    },
    contact: {
      phone1: '+251 90 488 5295',
      phone2: '+251 98 566 1540'
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPricingConfig();
      if (data) {
        // Merge with defaults in case of missing keys
        setConfig((prev: any) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePricingConfig(config);
      alert("Pricing configuration saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save pricing configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNested = (section: string, key: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleUpdateArray = (section: string, index: number, key: string, value: string) => {
    setConfig((prev: any) => {
      const arr = [...prev[section]];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [section]: arr };
    });
  };

  const handleRemoveArrayItem = (section: string, index: number) => {
    setConfig((prev: any) => {
      const arr = [...prev[section]];
      arr.splice(index, 1);
      return { ...prev, [section]: arr };
    });
  };

  const handleAddArrayItem = (section: string) => {
    setConfig((prev: any) => {
      const arr = [...prev[section], { label: "New Item", price: "0" }];
      return { ...prev, [section]: arr };
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8e8e93]">Loading pricing config...</div>;
  }

  const renderArraySection = (title: string, sectionKey: string) => (
    <div className="mb-8 border border-[#e2e8f0] rounded-xl p-6 bg-[#f8fafc]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#0f172a]">{title}</h3>
        <button onClick={() => handleAddArrayItem(sectionKey)} className="text-[#0284c7] hover:text-[#0369a1] text-sm font-medium flex items-center gap-1">
          <Plus size={16} /> Add Item
        </button>
      </div>
      <div className="space-y-3">
        {config[sectionKey].map((item: any, i: number) => (
          <div key={i} className="flex gap-4 items-center bg-white p-3 rounded-lg border border-[#e2e8f0]">
            <input 
              value={item.label} 
              onChange={e => handleUpdateArray(sectionKey, i, "label", e.target.value)}
              className="flex-1 p-2 border border-[#c6c6c8] rounded-lg text-sm"
              placeholder="Label"
            />
            <input 
              value={item.price} 
              onChange={e => handleUpdateArray(sectionKey, i, "price", e.target.value)}
              className="w-48 p-2 border border-[#c6c6c8] rounded-lg text-sm"
              placeholder="Price (e.g. 1000 ETB)"
            />
            <button onClick={() => handleRemoveArrayItem(sectionKey, i)} className="text-red-500 hover:text-red-700 p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-black">Pricing & Bank Configuration</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0284c7] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0369a1] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {renderArraySection("Standard Packages (3 times/day)", "standardPackages")}
          {renderArraySection("Premium Memberships (5 times/day)", "premiumPackages")}
          {renderArraySection("Add-ons & Extra Services", "addOns")}
        </div>
        
        <div className="space-y-8">
          <div className="border border-[#e2e8f0] rounded-xl p-6 bg-[#f8fafc]">
            <h3 className="text-lg font-semibold text-[#0f172a] mb-4">Bank Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Company Name</label>
                <input 
                  value={config.bankDetails.companyName} 
                  onChange={e => handleUpdateNested("bankDetails", "companyName", e.target.value)}
                  className="w-full p-2 border border-[#c6c6c8] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Bank Name</label>
                <input 
                  value={config.bankDetails.bankName} 
                  onChange={e => handleUpdateNested("bankDetails", "bankName", e.target.value)}
                  className="w-full p-2 border border-[#c6c6c8] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Account Number</label>
                <input 
                  value={config.bankDetails.accountNumber} 
                  onChange={e => handleUpdateNested("bankDetails", "accountNumber", e.target.value)}
                  className="w-full p-2 border border-[#c6c6c8] rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border border-[#e2e8f0] rounded-xl p-6 bg-[#f8fafc]">
            <h3 className="text-lg font-semibold text-[#0f172a] mb-4">Contact Phone Numbers</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Primary Phone</label>
                <input 
                  value={config.contact.phone1} 
                  onChange={e => handleUpdateNested("contact", "phone1", e.target.value)}
                  className="w-full p-2 border border-[#c6c6c8] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Secondary Phone</label>
                <input 
                  value={config.contact.phone2} 
                  onChange={e => handleUpdateNested("contact", "phone2", e.target.value)}
                  className="w-full p-2 border border-[#c6c6c8] rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
