import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontMap from './utils/fontMap'; // adjust path if needed



const fonts = [
  'Dancing Script',
  'Pacifico',
  'Great Vibes',
  'Courier Prime',
  'Parisienne',
  'Lobster',
  'Satisfy',
  'Shadows Into Light',
];

const PDFSignatureApp = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState(null);
  const [signatureMode, setSignatureMode] = useState('draw');
  const [signatureText, setSignatureText] = useState('');
  const [signatureColor, setSignatureColor] = useState('#000000');
  const [signatureFont, setSignatureFont] = useState('Dancing Script');
  const [signatureSize, setSignatureSize] = useState(32);
  const [signatureImageUrl, setSignatureImageUrl] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSignature, setActiveSignature] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSignatureFixed, setIsSignatureFixed] = useState(false);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const signatureCanvasRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const signatureRef = useRef(null);
  const pdfViewerRef = useRef(null);
const animationFrameId = useRef(null); 
  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      
      // Read file as ArrayBuffer for pdf-lib
      const arrayBuffer = await file.arrayBuffer();
      setPdfArrayBuffer(arrayBuffer);
      
      setSaveMessage('');
      setActiveSignature(false);
      setIsSignatureFixed(false);
    }
  };

  const handleDeletePDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfFile(null);
    setPdfUrl('');
    setPdfArrayBuffer(null);
    setSignatureImageUrl(null);
    setSignatureText('');
    setSaveMessage('');
    setActiveSignature(false);
    setIsSignatureFixed(false);
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImageUrl(dataUrl);
    setActiveSignature(true);
    setIsSignatureFixed(false);
  };

  const clearCanvas = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImageUrl(null);
    setActiveSignature(false);
    setIsSignatureFixed(false);
  };

  const handleSignatureTextChange = (e) => {
    setSignatureText(e.target.value);
    if (e.target.value.trim()) {
      setActiveSignature(true);
      setIsSignatureFixed(false);
    } else {
      setActiveSignature(false);
      setIsSignatureFixed(false);
    }
  };

  // Improved drag handling with better coordinate calculation
 


  const handleMouseMove = (e) => {
  if (!isDragging || !pdfContainerRef.current || !signatureRef.current) return;

  const containerRect = pdfContainerRef.current.getBoundingClientRect();

  // Calculate new X/Y based on drag offset
  const newX = e.clientX - containerRect.left - dragOffset.x;
  const newY = e.clientY - containerRect.top - dragOffset.y;

  // Clamp the position to keep the signature within the container bounds
  setPosition({
    x: Math.max(0, Math.min(newX, containerRect.width - signatureRef.current.offsetWidth)),
    y: Math.max(0, Math.min(newY, containerRect.height - signatureRef.current.offsetHeight)),
  });
};


  const handleMouseUp = () => {
  setIsDragging(false);
  if (animationFrameId.current) {
    cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = null;
  }
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

 const handleMouseDown = (e) => {
  if (!signatureRef.current || !activeSignature) return;

  e.preventDefault();

  // Get position of signature and container
  const signatureRect = signatureRef.current.getBoundingClientRect();
  const containerRect = pdfContainerRef.current.getBoundingClientRect();

  // Calculate offset of mouse inside the signature box
  const offsetX = e.clientX - signatureRect.left;
  const offsetY = e.clientY - signatureRect.top;

  setDragOffset({ x: offsetX, y: offsetY });
  setIsDragging(true);

  // Attach move/up listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

  const [fixedPosition, setFixedPosition] = useState({ x: 0, y: 0 });

const handleDoubleClick = () => {
  if (activeSignature && signatureRef.current && pdfContainerRef.current) {
    const sig = signatureRef.current.getBoundingClientRect();
    const container = pdfContainerRef.current.getBoundingClientRect();

    const x = sig.left - container.left;
    const y = sig.top - container.top;

    setFixedPosition({ x, y });
    setIsSignatureFixed(true);
    setSaveMessage('✔ Signature position fixed! You can now save the PDF.');
    setTimeout(() => setSaveMessage(''), 3000);
  }
};


  // Touch event handlers for mobile support
  const handleTouchStart = (e) => {
    if (!signatureRef.current || !activeSignature) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const signatureRect = signatureRef.current.getBoundingClientRect();
    
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - signatureRect.left,
      y: touch.clientY - signatureRect.top
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !pdfContainerRef.current || !signatureRef.current) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const containerRect = pdfContainerRef.current.getBoundingClientRect();
    const signatureRect = signatureRef.current.getBoundingClientRect();
    
    let newX = touch.clientX - containerRect.left - dragOffset.x;
    let newY = touch.clientY - containerRect.top - dragOffset.y;
    
    const signatureWidth = signatureRect.width;
    const signatureHeight = signatureRect.height;
    
    const maxX = containerRect.width - signatureWidth;
    const maxY = containerRect.height - signatureHeight;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Enhanced PDF saving with pdf-lib
const handleSavePDF = async (downloadOnly = false) => {
  if (!pdfArrayBuffer || !activeSignature || !isSignatureFixed) {
    if (!isSignatureFixed) {
      setSaveMessage('❌ Please double-click the signature to fix its position first');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    return;
  }

  setIsProcessing(true);
  setSaveMessage('⏳ Processing PDF...');

  try {
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    pdfDoc.registerFontkit(fontkit);
    const pages = pdfDoc.getPages();

    const signatureElem = signatureRef.current;
    const container = pdfContainerRef.current;
    const sigRect = signatureElem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const placedTop = sigRect.top - containerRect.top + container.scrollTop;

    // Estimate which page it's on by dividing total scrollTop + top offset by page height
    const renderedPageHeight = container.offsetHeight / pages.length; // rough assumption
    const pageIndex = Math.floor(placedTop / renderedPageHeight);
    const page = pages[pageIndex];
    if (!page) throw new Error('Could not determine target page.');

    const { width: pageWidth, height: pageHeight } = page.getSize();

    const scaleX = pageWidth / container.offsetWidth;
    const scaleY = pageHeight / renderedPageHeight;

    const offsetX = (sigRect.left - containerRect.left) * scaleX;
    const offsetY = (sigRect.top - containerRect.top + container.scrollTop - pageIndex * renderedPageHeight) * scaleY;
    const pdfX = offsetX;
    const pdfY = pageHeight - (offsetY + sigRect.height * scaleY);

    const hex = signatureColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    if (signatureMode === 'type' && signatureText) {
      const fontUrl = fontMap[signatureFont];
      if (!fontUrl) throw new Error(`Font not found for "${signatureFont}"`);
      const fontBytes = await fetch(fontUrl).then((res) => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      page.drawText(signatureText, {
        x: pdfX,
        y: pdfY,
        size: signatureSize * scaleY,
        font: customFont,
        color: rgb(r, g, b),
      });
    } else if (signatureMode === 'draw' && signatureImageUrl) {
      const imageBytes = await fetch(signatureImageUrl).then((res) => res.arrayBuffer());
      const image = await pdfDoc.embedPng(imageBytes);

      const pdfWidth = sigRect.width * scaleX;
      const pdfHeight = sigRect.height * scaleY;

      page.drawImage(image, {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `signed_${pdfFile.name}`;

    if (downloadOnly) {
      link.click();
      setSaveMessage('✔ PDF downloaded successfully!');
    } else {
      setPdfUrl(url);
      setSaveMessage('✔ PDF saved with signature!');
    }

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error(err);
    setSaveMessage('❌ Error saving PDF: ' + err.message);
  } finally {
    setIsProcessing(false);
    setTimeout(() => setSaveMessage(''), 5000);
  }
};



  const signatureStyle = {
    position: 'absolute',
    top: position.y,
    left: position.x,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    border: isSignatureFixed ? '2px solid #10b981' : '2px dashed #4f46e5',
    borderRadius: '4px',
    padding: '2px',
    backgroundColor: isSignatureFixed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
    transition: isDragging ? 'none' : 'all 0.2s ease',
    zIndex: 10,
    touchAction: 'none'
  };

  return (
    <div style={{ fontFamily: 'Segoe UI', padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: 'auto' }}>
        <h1 style={{ fontSize: '32px', color: '#4f46e5', marginBottom: '16px' }}>PDF Signature Studio</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div 
            ref={pdfContainerRef} 
            style={{ 
              flex: 3, 
              minWidth: '300px', 
              background: 'white', 
              borderRadius: '8px', 
              padding: '16px', 
              minHeight: '600px', 
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {pdfUrl ? (
              <>
                <iframe 
                  ref={pdfViewerRef}
                  src={pdfUrl} 
                  title="PDF Viewer" 
                  width="100%" 
                  height="600px" 
                  style={{ border: 'none', borderRadius: '8px', display: 'block' }}
                  onLoad={(e) => {
                    const iframe = e.target;
                    setPdfDimensions({
                      width: iframe.offsetWidth,
                      height: iframe.offsetHeight
                    });
                  }}
                />
                {activeSignature && signatureMode === 'type' && signatureText && (
  <div
    ref={signatureRef}
    onMouseDown={handleMouseDown}
    onDoubleClick={handleDoubleClick}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    style={{
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      fontFamily: signatureFont,
      fontSize: `${signatureSize}px`,
      color: signatureColor,
      whiteSpace: 'nowrap',
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      zIndex: 10,
      pointerEvents: 'auto',
      background: isSignatureFixed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
      border: isSignatureFixed ? '2px solid #10b981' : '2px dashed #4f46e5',
      borderRadius: '4px',
      padding: '2px',
    }}
    title="Drag to position, double-click to fix position"
  >
    {signatureText}
  </div>
)}

                {activeSignature && signatureMode === 'draw' && signatureImageUrl && (
                  <img
                    ref={signatureRef}
                    src={signatureImageUrl}
                    alt="Signature"
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      ...signatureStyle,
                      width: '150px',
                      height: 'auto',
                      pointerEvents: 'auto'
                    }}
                    title="Drag to position, double-click to fix position"
                    draggable={false}
                  />
                )}
                {activeSignature && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'rgba(0,0,0,0.8)', 
                    color: 'white', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    fontSize: '12px',
                    maxWidth: '200px',
                    textAlign: 'center'
                  }}>
                    {isSignatureFixed ? '✅ Position Fixed' : '🔄 Drag signature, then double-click to fix'}
                  </div>
                )}
              </>
            ) : (
              <label style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '2px dashed #ccc', 
                padding: '60px', 
                borderRadius: '12px', 
                cursor: 'pointer',
                height: '100%',
                minHeight: '500px'
              }}>
                <div style={{ fontSize: '60px', color: '#667eea', marginBottom: '16px' }}>📄</div>
                <span style={{ color: '#444', fontSize: '18px', marginBottom: '8px' }}>Click to upload PDF</span>
                <span style={{ color: '#666', fontSize: '14px' }}>Supports PDF files up to 10MB</span>
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handlePDFUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '280px', background: 'white', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', color: '#333' }}>Signature Tools</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <button 
                onClick={() => setSignatureMode('draw')} 
                style={{ 
                  marginRight: '8px', 
                  padding: '10px 16px', 
                  background: signatureMode === 'draw' ? '#667eea' : '#e5e7eb', 
                  color: signatureMode === 'draw' ? 'white' : '#333', 
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ✏️ Draw
              </button>
              <button 
                onClick={() => setSignatureMode('type')} 
                style={{ 
                  padding: '10px 16px', 
                  background: signatureMode === 'type' ? '#667eea' : '#e5e7eb', 
                  color: signatureMode === 'type' ? 'white' : '#333', 
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📝 Type
              </button>
            </div>

            {signatureMode === 'type' ? (
              <div>
                <input 
                  type="text" 
                  value={signatureText} 
                  onChange={handleSignatureTextChange} 
                  placeholder="Enter your signature text" 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '2px solid #e5e7eb', 
                    marginBottom: '16px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }} 
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {fonts.map((font) => (
                    <div 
                      key={font} 
                      onClick={() => setSignatureFont(font)} 
                      style={{ 
                        fontFamily: font, 
                        fontSize: `${Math.min(signatureSize, 24)}px`, 
                        color: signatureColor, 
                        padding: '12px', 
                        border: font === signatureFont ? '2px solid #4f46e5' : '2px solid #e5e7eb', 
                        borderRadius: '8px', 
                        marginBottom: '8px', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: font === signatureFont ? '#f8fafc' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (font !== signatureFont) {
                          e.target.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (font !== signatureFont) {
                          e.target.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      {signatureText || 'Your Signature'}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    Draw your signature below:
                  </label>
                  <canvas 
                    ref={signatureCanvasRef} 
                    width={300} 
                    height={120} 
                    onMouseDown={startDrawing} 
                    onMouseMove={draw} 
                    onMouseUp={stopDrawing} 
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing} 
                    onTouchMove={draw} 
                    onTouchEnd={stopDrawing} 
                    style={{ 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '8px', 
                      width: '100%', 
                      height: '120px',
                      cursor: 'crosshair',
                      backgroundColor: '#fafafa',
                      touchAction: 'none'
                    }} 
                  />
                </div>
                <button 
                  onClick={clearCanvas} 
                  style={{ 
                    padding: '8px 16px', 
                    background: '#f3f4f6', 
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: '500'
                  }}
                >
                  🔄 Clear Canvas
                </button>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Signature Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="color" 
                  value={signatureColor} 
                  onChange={(e) => setSignatureColor(e.target.value)} 
                  style={{ 
                    width: '50px', 
                    height: '50px', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {signatureColor.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Font Size: {signatureSize}px
              </label>
              <input 
                type="range" 
                min="16" 
                max="72" 
                value={signatureSize} 
                onChange={(e) => setSignatureSize(parseInt(e.target.value))} 
                style={{ 
                  width: '100%',
                  height: '6px',
                  background: '#e5e7eb',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: 'pointer'
                }} 
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleSavePDF(false)} 
            disabled={!activeSignature || !isSignatureFixed || isProcessing}
            style={{ 
              background: (!activeSignature || !isSignatureFixed || isProcessing) ? '#9ca3af' : '#10b981', 
              color: 'white', 
              padding: '12px 24px', 
              borderRadius: '8px',
              border: 'none',
              cursor: (!activeSignature || !isSignatureFixed || isProcessing) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isProcessing ? '⏳ Processing...' : '💾 Save PDF'}
          </button>
          <button 
            onClick={() => handleSavePDF(true)} 
            disabled={!activeSignature || !isSignatureFixed || isProcessing}
            style={{ 
              background: (!activeSignature || !isSignatureFixed || isProcessing) ? '#9ca3af' : '#3b82f6', 
              color: 'white', 
              padding: '12px 24px', 
              borderRadius: '8px',
              border: 'none',
              cursor: (!activeSignature || !isSignatureFixed || isProcessing) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isProcessing ? '⏳ Processing...' : '📥 Download PDF'}
          </button>
          {pdfFile && (
            <button 
              onClick={handleDeletePDF} 
              disabled={isProcessing}
              style={{ 
                background: '#ef4444', 
                color: 'white', 
                padding: '12px 24px', 
                borderRadius: '8px',
                border: 'none',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🗑️ Delete PDF
            </button>
          )}
          {saveMessage && (
            <div style={{ 
              color: saveMessage.includes('✔') ? '#10b981' : saveMessage.includes('⏳') ? '#f59e0b' : '#ef4444', 
              fontWeight: '500',
              padding: '10px 16px',
              backgroundColor: saveMessage.includes('✔') ? '#d1fae5' : saveMessage.includes('⏳') ? '#fef3c7' : '#fee2e2',
              borderRadius: '8px',
              fontSize: '14px',
              border: `1px solid ${saveMessage.includes('✔') ? '#10b981' : saveMessage.includes('⏳') ? '#f59e0b' : '#ef4444'}20`
            }}>
              {saveMessage}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '16px' }}>📋 Instructions:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '14px' }}>
            <li>Upload a PDF file</li>
            <li>Choose to draw or type your signature</li>
            <li>Drag the signature to your desired position</li>
            <li>Double-click the signature to fix its position</li>
            <li>Click "Download PDF" to save your signed document</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PDFSignatureApp;