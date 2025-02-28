'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import MarketTemplate from '../../../components/MarketTemplate';
import styles from './template.module.css';

export default function AdminMarketTemplate() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load Markets
  useEffect(() => {
    async function loadMarkets() {
      if (!user) {
        console.log('No user logged in');
        return;
      }

      console.log('Loading markets...');
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('Markets loaded:', data);
        setMarkets(data || []);
        
        // If there's only one market, select it automatically
        if (data?.length === 1) {
          console.log('Auto-selecting single market:', data[0].id);
          setSelectedMarketId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading markets:', error);
        toast.error('Failed to load markets');
      } finally {
        setLoading(false);
      }
    }
    loadMarkets();
  }, [user]);

  // Debug selected market changes
  useEffect(() => {
    console.log('Selected market ID changed to:', selectedMarketId);
  }, [selectedMarketId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Market Template</h1>
        
        {/* Market Selection */}
        {loading ? (
          <div className={styles.loading}>Loading markets...</div>
        ) : (
          <select
            value={selectedMarketId || ''}
            onChange={(e) => {
              console.log('Market selected:', e.target.value);
              setSelectedMarketId(e.target.value);
            }}
            className={styles.marketSelect}
          >
            <option value="">Select a Market</option>
            {markets.map(market => (
              <option key={market.id} value={market.id}>
                {market.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Template Component */}
      {selectedMarketId && (
        <div className={styles.templateContainer}>
          <MarketTemplate marketId={selectedMarketId} />
        </div>
      )}
    </div>
  );
}
