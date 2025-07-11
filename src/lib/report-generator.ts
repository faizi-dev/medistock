
import { format } from 'date-fns';
import type { MedicalItem, Vehicle, Case, ModuleBag } from '@/types';
import type { TranslationKey } from './translations';

type ReportType = 'full' | 'restock' | 'expiring';

const generateHtmlShell = (title: string, content: string, t: (key: TranslationKey) => string) => {
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 2rem; background-color: #f8f9fa; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background-color: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { font-size: 2rem; border-bottom: 2px solid #2071a8; padding-bottom: 0.5rem; margin-bottom: 1rem; color: #2071a8; }
        h2 { font-size: 1.6rem; margin-top: 2.5rem; padding-bottom: 0.5rem; color: #2c3e50; }
        h3 { font-size: 1.3rem; margin-top: 1.5rem; color: #3498db; }
        h4 { font-size: 1.1rem; margin-top: 1rem; color: #95a5a6; font-weight: bold; text-transform: uppercase; }
        .vehicle-divider { border: 0; border-top: 2px dashed #cccccc; margin: 2.5rem 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { border: 1px solid #dee2e6; padding: 0.75rem; text-align: left; }
        th { background-color: #f1f3f5; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        .summary { border: 1px solid #ccc; background-color: #f9f9f9; padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px; }
        .summary p { margin: 0.5rem 0; font-size: 1.1rem; }
        .summary strong { color: #2071a8; }
        .no-items { text-align: center; padding: 2rem; color: #868e96; }
        .understocked { color: #dc3545; font-weight: bold; }
        .overstocked { color: #007bff; }
        .footer { text-align: center; margin-top: 2rem; font-size: 0.8rem; color: #6c757d; }
        .button-container { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 100; }
        .report-button { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; background-color: #2071a8; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .report-button:disabled { background-color: #999; cursor: not-allowed; opacity: 0.7; }
        .loader { width: 1rem; height: 1rem; border: 2px solid #fff; border-bottom-color: transparent; border-radius: 50%; display: inline-block; vertical-align: middle; box-sizing: border-box; animation: rotation 1s linear infinite; margin-right: 0.5rem; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media print {
          .button-container { display: none; }
          body { padding: 0; }
          .container { box-shadow: none; border-radius: 0; padding: 1rem; }
        }
      </style>
    </head>
    <body>
      <div class="button-container">
        <button class="report-button" onclick="window.print()">${t('report.print')}</button>
        <button class="report-button" id="download-pdf-btn" disabled>${t('report.download')}</button>
      </div>
      <div class="container" id="report-content">
        ${content}
        <div class="footer">MediStock Inventory Management System</div>
      </div>
      <script>
        function downloadPDF() {
          const report = document.getElementById('report-content');
          const downloadBtn = document.getElementById('download-pdf-btn');
          
          if (!report || !downloadBtn) {
            console.error('Report content element or download button not found.');
            return;
          }
           if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            alert("Could not find required libraries. They might be blocked by your ad-blocker or failed to load. Please check the console and try again.");
            return;
          }

          const originalButtonText = downloadBtn.innerHTML;
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = \`<span class="loader"></span> ${t('report.downloading')}\`;

          const { jsPDF } = window.jspdf;
          
          window.html2canvas(report, { scale: 2, useCORS: true }).then(canvas => {
            try {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
              });

              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save('${safeTitle}.pdf');
            } catch (e) {
              console.error("Could not generate PDF from canvas:", e);
              alert("Sorry, there was an error generating the PDF.");
            }
          }).catch((err) => {
            console.error("html2canvas failed:", err);
            alert("Sorry, there was an error capturing the page content for the PDF.");
          }).finally(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalButtonText;
          });
        }

        function initializePdfDownloader() {
          const downloadBtn = document.getElementById('download-pdf-btn');
          
          if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            setTimeout(initializePdfDownloader, 100);
            return;
          }

          if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = '${t('report.download')}';
            downloadBtn.addEventListener('click', downloadPDF);
          }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
             const downloadBtn = document.getElementById('download-pdf-btn');
             if(downloadBtn) downloadBtn.textContent = 'Loading...';
             initializePdfDownloader();
        });
      </script>
    </body>
    </html>
  `;
};

const getReportTitle = (reportType: ReportType, t: (key: TranslationKey) => string) => {
    switch (reportType) {
        case 'full': return t('report.title.full');
        case 'restock': return t('report.title.restock');
        case 'expiring': return t('report.title.expiring');
    }
}

export const generateReportHtml = (
  items: MedicalItem[],
  vehicles: Vehicle[],
  cases: Case[],
  moduleBags: ModuleBag[],
  reportType: ReportType,
  t: (key: TranslationKey) => string
): string => {
  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
  const caseMap = new Map(cases.map(c => [c.id, c]));
  const moduleBagMap = new Map(moduleBags.map(m => [m.id, m]));

  const fortyTwoDaysFromNow = new Date();
  fortyTwoDaysFromNow.setDate(fortyTwoDaysFromNow.getDate() + 42);

  let filteredItems = items;
  if (reportType === 'restock') {
    filteredItems = items.filter(item => item.quantity < item.targetQuantity);
  } else if (reportType === 'expiring') {
    filteredItems = items.filter(item => item.expirationDate && item.expirationDate.toDate() < fortyTwoDaysFromNow);
  }

  // Group items by vehicle -> case -> module
  const groupedData = new Map<string, Map<string, Map<string, MedicalItem[]>>>();

  for (const item of filteredItems) {
    const module = moduleBagMap.get(item.moduleId);
    if (!module) continue;
    const caseItem = caseMap.get(module.caseId);
    if (!caseItem) continue;
    const vehicle = vehicleMap.get(caseItem.vehicleId);
    if (!vehicle) continue;

    if (!groupedData.has(vehicle.id)) {
      groupedData.set(vehicle.id, new Map());
    }
    const vehicleGroup = groupedData.get(vehicle.id)!;

    if (!vehicleGroup.has(caseItem.id)) {
      vehicleGroup.set(caseItem.id, new Map());
    }
    const caseGroup = vehicleGroup.get(caseItem.id)!;

    if (!caseGroup.has(module.id)) {
      caseGroup.set(module.id, []);
    }
    const moduleGroup = caseGroup.get(module.id)!;
    moduleGroup.push(item);
  }

  // Build Summary
  const totalRestockNeeded = items.reduce((acc, item) => {
    const needed = item.targetQuantity - item.quantity;
    return acc + (needed > 0 ? needed : 0);
  }, 0);

  let summaryHtml = `
    <div class="summary">
        <h2>${t('report.summary')}</h2>
        <p><strong>${t('report.totalItems')}:</strong> ${items.length}</p>
        <p><strong>${t('report.understockedItems')}:</strong> ${items.filter(i => i.quantity < i.targetQuantity).length}</p>
        <p><strong>${t('report.totalRestock')}:</strong> ${totalRestockNeeded}</p>
        <p><strong>${t('report.expiringItems')}:</strong> ${items.filter(i => i.expirationDate && i.expirationDate.toDate() < fortyTwoDaysFromNow).length}</p>
    </div>`;
  
  // Build main content
  let mainContent = '';
  if (groupedData.size === 0) {
      mainContent += `<div class="no-items">${t('report.noItems')}</div>`;
  } else {
    const vehicleEntries = Array.from(groupedData.entries());
    for (let i = 0; i < vehicleEntries.length; i++) {
        const [vehicleId, casesMap] = vehicleEntries[i];
        const vehicle = vehicleMap.get(vehicleId)!;
        mainContent += `<h2>${t('report.vehicle')}: ${vehicle.name}</h2>`;
        for (const [caseId, modulesMap] of casesMap.entries()) {
            const caseItem = caseMap.get(caseId)!;
            mainContent += `<h3>${t('report.case')}: ${caseItem.name}</h3>`;
            for (const [moduleId, itemsList] of modulesMap.entries()) {
            const moduleBag = moduleBagMap.get(moduleId)!;
            mainContent += `<h4>${t('report.module')}: ${moduleBag.name}</h4>`;
            mainContent += `
                <table>
                <thead>
                    <tr>
                    <th>${t('report.itemName')}</th>
                    <th>${t('report.quantity')}</th>
                    <th>${t('report.target')}</th>
                    <th>${t('report.restockNeeded')}</th>
                    <th>${t('report.expires')}</th>
                    </tr>
                </thead>
                <tbody>
            `;
            for (const item of itemsList) {
                const restockNeeded = item.targetQuantity - item.quantity;
                const restockClass = restockNeeded > 0 ? 'understocked' : '';
                mainContent += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.targetQuantity}</td>
                    <td class="${restockClass}">${restockNeeded > 0 ? restockNeeded : '0'}</td>
                    <td>${item.expirationDate ? format(item.expirationDate.toDate(), 'yyyy-MM-dd') : 'N/A'}</td>
                </tr>
                `;
            }
            mainContent += `</tbody></table>`;
            }
        }
        if (i < vehicleEntries.length - 1) {
            mainContent += `<hr class="vehicle-divider" />`;
        }
    }
  }

  const reportTitle = getReportTitle(reportType, t);
  const generatedOn = new Date().toLocaleString();
  const titleHtml = `<h1>${reportTitle}</h1><p><em>${t('report.generatedOn')}: ${generatedOn}</em></p>`;

  const fullHtmlContent = titleHtml + summaryHtml + mainContent;

  return generateHtmlShell(reportTitle, fullHtmlContent, t);
};
