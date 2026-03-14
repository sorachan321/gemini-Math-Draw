import React, { useState, useEffect, useRef } from 'react';

export function TikzRenderer({ code, onResize }: { code: string, onResize?: () => void }) {
  const [showSource, setShowSource] = useState(false);
  const [height, setHeight] = useState(200);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
        <script src="https://tikzjax.com/v1/tikzjax.js"></script>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100px;
            background: transparent;
            overflow: hidden;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <script type="text/tikz">
          ${code}
        </script>
        <script>
          // Send height to parent when content changes
          const sendHeight = () => {
            const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            window.parent.postMessage({ type: 'resize', height: height + 20 }, '*');
          };
          
          const observer = new MutationObserver((mutations) => {
            sendHeight();
          });
          
          observer.observe(document.body, { childList: true, subtree: true, attributes: true });
          
          // Also check periodically just in case fonts load later
          setTimeout(sendHeight, 500);
          setTimeout(sendHeight, 2000);
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'resize' && e.data.height) {
        // Only update if it's from our iframe
        if (iframeRef.current && iframeRef.current.contentWindow === e.source) {
          setHeight(Math.max(200, e.data.height));
          if (onResize) {
            setTimeout(onResize, 50);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="my-4 flex flex-col items-center border border-gray-200 rounded-lg p-4 bg-white text-black shadow-sm">
      <div className="w-full flex justify-center overflow-auto">
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full border-none transition-all duration-300"
          style={{ height: `${height}px` }}
          title="TikZ Render"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
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



