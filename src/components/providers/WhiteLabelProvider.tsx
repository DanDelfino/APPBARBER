'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';

/* ==============================
   White-Label Branding Context
   Loads shop_settings from Supabase
   and exposes branding to the entire app.
   ============================== */

interface WhiteLabelConfig {
  brandName: string;
  brandAccent: string;
  logoUrl: string;
  shopName: string;
  phone: string;
  address: string;
  loading: boolean;
}

const defaultConfig: WhiteLabelConfig = {
  brandName: 'BarberManager',
  brandAccent: '#3b82f6',
  logoUrl: '',
  shopName: '',
  phone: '',
  address: '',
  loading: true,
};

const WhiteLabelContext = createContext<WhiteLabelConfig>(defaultConfig);

export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setConfig({
        brandName: data.brand_name || 'BarberManager',
        brandAccent: data.brand_accent || '#3b82f6',
        logoUrl: data.logo_url || '',
        shopName: data.shop_name || '',
        phone: data.phone || '',
        address: data.address || '',
        loading: false,
      });
    } else {
      setConfig(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <WhiteLabelContext.Provider value={config}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export const useWhiteLabel = () => useContext(WhiteLabelContext);
