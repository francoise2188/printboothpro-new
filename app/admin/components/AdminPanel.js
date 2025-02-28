'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPanel({ children }) {
  const [marketsExpanded, setMarketsExpanded] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);

  const linkStyle = {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.875rem',
    padding: '0.75rem 1.5rem',
    textDecoration: 'none',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'block',
    width: '100%'
  };

  const sublinkStyle = {
    ...linkStyle,
    padding: '0.75rem 1.5rem 0.75rem 3rem',
    fontSize: '0.8rem'
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
    e.currentTarget.style.borderLeft = '3px solid white';
    e.currentTarget.style.color = 'white';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.borderLeft = '3px solid transparent';
    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
  };

  return (
    <div style={{ 
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      {/* Left Sidebar */}
      <nav style={{ 
        width: '280px',
        backgroundColor: '#1e293b',
        position: 'fixed',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo/Brand */}
        <div style={{ 
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h1 style={{ 
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white'
          }}>
            Photo Booth Admin
          </h1>
        </div>

        {/* Navigation Links */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem 0'
        }}>
          <Link href="/admin" 
            style={linkStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            Dashboard
          </Link>
          
          <div>
            <div 
              style={linkStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => setEventsExpanded(!eventsExpanded)}>
              Events {eventsExpanded ? '▼' : '▶'}
            </div>
            
            {eventsExpanded && (
              <>
                <Link 
                  href="/admin/events" 
                  style={sublinkStyle}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}>
                  Event Management
                </Link>
                <Link 
                  href="/admin/template" 
                  style={sublinkStyle}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}>
                  Template Manager
                </Link>
              </>
            )}
          </div>
          
          {/* Markets section */}
          <div>
            <div 
              style={linkStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => setMarketsExpanded(!marketsExpanded)}>
              Markets {marketsExpanded ? '▼' : '▶'}
            </div>
            
            {marketsExpanded && (
              <>
                <Link 
                  href="/admin/markets" 
                  style={sublinkStyle}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}>
                  Market List
                </Link>
                <Link 
                  href="/admin/markets/payments" 
                  style={sublinkStyle}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}>
                  Settings
                </Link>
              </>
            )}
          </div>
          
          <Link href="/admin/design" 
            style={linkStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            Design Settings
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ 
        marginLeft: '280px',
        flex: '1',
        backgroundColor: '#f3f4f6',
        padding: '2rem',
        overflow: 'hidden',
        maxWidth: 'calc(100vw - 280px)'
      }}>
        {children}
      </main>
    </div>
  );
}