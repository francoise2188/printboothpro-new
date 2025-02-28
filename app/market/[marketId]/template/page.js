'use client';

import { useParams } from 'next/navigation';
import MarketTemplate from '../../../components/MarketTemplate';

export default function MarketTemplatePage() {
  const params = useParams();
  const marketId = params.marketId;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Market Template</h1>
      <MarketTemplate marketId={marketId} />
    </div>
  );
}