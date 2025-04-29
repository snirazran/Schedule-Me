// components/ui/navbar/Navbar.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  return (
    <nav className="w-full bg-white border-b-1 border-[#e2e2e2] px-6 py-3 flex justify-between items-center">
      {/* Logo or Brand Name */}
      <div className="text-2xl font-bold">
        Schedule <span className="text-[#ff006e]">Me</span>
      </div>
      {/* Log In Button */}
      <Button className="bg-[#ff006e] text-white">Log In</Button>
    </nav>
  );
}
