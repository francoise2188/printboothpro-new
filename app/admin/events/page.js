'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import EventsPage from './EventsPage';

export default function Page() {
  return <EventsPage />;
}
