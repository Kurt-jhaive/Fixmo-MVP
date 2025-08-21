// Certificate Viewer Fix - Simple overlay approach
// This will be integrated into the certificate manager

// Simple certificate viewer that creates an overlay
function showCertificateViewer(filePath) {
    console.log('showCertificateViewer called with filePath:', filePath);
    
    // Clean up the file path to ensure proper formatting
    let cleanPath = filePath;
    if (filePath.startsWith('/uploads/')) {
        cleanPath = filePath;
    } else if (filePath.startsWith('uploads/')) {
        cleanPath = '/' + filePath;
    } else {
        // Handle malformed paths like "/uploadscertificatescertificateFile-..."
        if (filePath.includes('uploads') && !filePath.includes('/uploads/')) {
            cleanPath = filePath.replace(/uploads([^\/])/, '/uploads/$1');
        }
    }
    
    console.log('Cleaned path:', cleanPath);

    // Remove existing certificate viewer if any
    const existingViewer = document.getElementById('certificateViewer');
    if (existingViewer) {
        existingViewer.remove();
    }

    // Create the certificate viewer overlay
    const viewer = document.createElement('div');
    viewer.id = 'certificateViewer';
    viewer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        cursor: pointer;
    `;
    
    // Determine file type
    const fileExtension = cleanPath.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';

    let content = '';
    if (isImage) {
        content = `
            <div style="
                background: white;
                border-radius: 8px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                cursor: default;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                ">
                    <h3 style="margin: 0; color: #333; font-size: 1.25rem;">Certificate Image</h3>
                    <button onclick="document.getElementById('certificateViewer').remove()" style="
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: #666;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 4px;
                    ">✕</button>
                </div>
                <div style="
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    min-height: 300px;
                ">
                    <img src="${cleanPath}" alt="Certificate" style="
                        max-width: 100%;
                        max-height: 70vh;
                        object-fit: contain;
                        border-radius: 4px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    " onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; text-align: center; padding: 2rem; color: #666;">
                        <div style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;">⚠️</div>
                        <p>Unable to load certificate image</p>
                        <a href="${cleanPath}" target="_blank" style="
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.75rem 1.5rem;
                            background: #5bc0de;
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 500;
                        ">📥 Download File</a>
                    </div>
                </div>
            </div>
        `;
    } else if (isPDF) {
        content = `
            <div style="
                background: white;
                border-radius: 8px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                cursor: default;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                ">
                    <h3 style="margin: 0; color: #333; font-size: 1.25rem;">Certificate PDF</h3>
                    <button onclick="document.getElementById('certificateViewer').remove()" style="
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: #666;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 4px;
                    ">✕</button>
                </div>
                <div style="
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    min-height: 300px;
                ">
                    <iframe src="${cleanPath}" style="
                        width: 80vw;
                        height: 70vh;
                        border: none;
                        border-radius: 4px;
                    " frameborder="0"></iframe>
                </div>
            </div>
        `;
    } else {
        content = `
            <div style="
                background: white;
                border-radius: 8px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                cursor: default;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                ">
                    <h3 style="margin: 0; color: #333; font-size: 1.25rem;">Certificate Document</h3>
                    <button onclick="document.getElementById('certificateViewer').remove()" style="
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: #666;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 4px;
                    ">✕</button>
                </div>
                <div style="
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    min-height: 300px;
                ">
                    <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 4rem; color: #6c757d; margin-bottom: 1rem;">📄</div>
                        <h4 style="margin: 1rem 0 0.5rem 0; color: #333;">Document File</h4>
                        <p style="color: #666; margin-bottom: 1.5rem;">This file cannot be previewed in the browser.</p>
                        <a href="${cleanPath}" target="_blank" style="
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.75rem 1.5rem;
                            background: #5bc0de;
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 500;
                        ">📥 Download File</a>
                    </div>
                </div>
            </div>
        `;
    }

    viewer.innerHTML = content;

    // Add click outside to close
    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) {
            viewer.remove();
        }
    });

    // Add to body and show
    document.body.appendChild(viewer);
    console.log('Certificate viewer created and added to DOM');
    
    // Force reflow and ensure viewer is visible
    setTimeout(() => {
        viewer.style.opacity = '1';
        console.log('Certificate viewer should now be visible');
    }, 10);
}

// Make it globally available
window.showCertificateViewer = showCertificateViewer;
