import React, { useEffect, useRef, useState } from 'react';

export function TikzRenderer({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    containerRef.current.innerHTML = '';
    
    // Create script element
    const script = document.createElement('script');
    script.type = 'text/tikz';
    script.textContent = code;
    
    // Append to container
    containerRef.current.appendChild(script);
    
    // Trigger TikJax to process the new script tag
    if (typeof window.onload === 'function') {
      // @ts-ignore
      window.onload(new Event('load'));
    }
  }, [code]);

  return (
    <div className="my-4 flex flex-col items-center border border-gray-200 rounded-lg p-4 bg-white text-black shadow-sm">
      <div ref={containerRef} className="tikz-container flex justify-center w-full overflow-auto min-h-[100px]" />
      <button 
        onClick={() => setShowSource(!showSource)}
        className="mt-4 text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
      >
        {showSource ? '隐藏 TikZ 源码' : '查看 TikZ 源码'}
      </button>
      {showSource && (
        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs w-full overflow-auto text-left border border-gray-100">
          <code className="text-gray-800">{code}</code>
        </pre>
      )}
    </div>
  );
}

