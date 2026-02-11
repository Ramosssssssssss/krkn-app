import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface PDFData {
    title: string;
    subtitle: string;
    folio: string;
    fecha: string;
    sucursal: string;
    almacen: string;
    usuario: string;
    concepto: string;
    descripcion?: string;
    articulos: Array<{
        clave: string;
        nombre: string;
        cantidad: number | string;
        unidad: string;
        precio?: number;
        subtotal?: number;
    }>;
    totales: {
        partidas: number;
        unidades: number;
        monto?: number;
    };
    accentColor: string;
}

export function getPDFHtml(data: PDFData) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #333;
                margin: 0;
                padding: 40px;
                background-color: #fff;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
            }
            .logo-area {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .logo-box {
                width: 40px;
                height: 40px;
                background-color: ${data.accentColor};
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
                font-size: 24px;
                border-radius: 4px;
            }
            .logo-text {
                font-weight: 800;
                font-size: 18px;
                color: ${data.accentColor};
                letter-spacing: 1px;
            }
            .doc-info {
                text-align: right;
            }
            .doc-label {
                font-size: 10px;
                font-weight: 700;
                color: #999;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            .doc-number {
                font-size: 16px;
                font-weight: 800;
                color: #333;
            }
            .banner {
                background-color: ${data.accentColor}15;
                color: ${data.accentColor};
                padding: 6px 15px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 800;
                display: inline-block;
                margin-bottom: 25px;
            }
            .main-title {
                text-align: center;
                font-size: 24px;
                font-weight: 900;
                margin-bottom: 50px;
                text-transform: uppercase;
                color: #1a1a1a;
                line-height: 1.2;
                max-width: 80%;
                margin-left: auto;
                margin-right: auto;
            }
            .section {
                margin-bottom: 30px;
            }
            .section-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 800;
                color: ${data.accentColor};
                text-transform: uppercase;
                margin-bottom: 15px;
                border-bottom: 1px solid #f0f0f0;
                padding-bottom: 8px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px 40px;
            }
            .info-item {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
            }
            .info-label {
                color: #777;
                font-weight: 500;
            }
            .info-value {
                font-weight: 700;
                color: #333;
            }
            .description-box {
                background-color: #f9f9f9;
                border-left: 4px solid ${data.accentColor};
                padding: 15px;
                font-size: 14px;
                color: #555;
                line-height: 1.5;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            th {
                text-align: left;
                background-color: ${data.accentColor};
                color: white;
                font-size: 12px;
                font-weight: 800;
                padding: 12px 15px;
                text-transform: uppercase;
            }
            td {
                padding: 12px 15px;
                font-size: 13px;
                border-bottom: 1px solid #eee;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .totals-area {
                margin-top: 30px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            }
            .total-row {
                display: flex;
                justify-content: flex-end;
                gap: 20px;
                width: 300px;
            }
            .total-label {
                color: #777;
                font-weight: 600;
                font-size: 14px;
            }
            .total-value {
                font-weight: 700;
                font-size: 14px;
                color: #333;
                min-width: 100px;
                text-align: right;
            }
            .grand-total {
                margin-top: 10px;
                border-top: 2px solid #eee;
                padding-top: 10px;
            }
            .grand-total .total-label {
                color: ${data.accentColor};
                font-weight: 800;
                font-size: 18px;
            }
            .grand-total .total-value {
                color: ${data.accentColor};
                font-weight: 900;
                font-size: 22px;
            }
            .footer-sign {
                margin-top: 80px;
                text-align: center;
            }
            .signature-line {
                width: 250px;
                border-top: 1px solid #ccc;
                margin: 0 auto 10px;
            }
            .signature-text {
                font-size: 12px;
                font-weight: 700;
                color: #999;
                text-transform: uppercase;
            }
            .footer-meta {
                margin-top: 100px;
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #bbb;
                text-transform: uppercase;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-area">
                <div class="logo-box">K</div>
                <div class="logo-text">KRKN SYSTEMS</div>
            </div>
            <div class="doc-info">
                <div class="doc-label">DOCUMENTO</div>
                <div class="doc-number">${data.folio}</div>
            </div>
        </div>

        <div class="banner">FINALIZADO</div>

        <h1 class="main-title">${data.title}</h1>

        <div class="section">
            <div class="section-title">DETALLES DEL FOLIO</div>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">Folio</span> <span class="info-value">${data.folio}</span></div>
                <div class="info-item"><span class="info-label">Fecha</span> <span class="info-value">${data.fecha}</span></div>
                <div class="info-item"><span class="info-label">Sucursal</span> <span class="info-value">${data.sucursal}</span></div>
                <div class="info-item"><span class="info-label">Almacén</span> <span class="info-value">${data.almacen}</span></div>
                <div class="info-item"><span class="info-label">Usuario</span> <span class="info-value">${data.usuario}</span></div>
                <div class="info-item"><span class="info-label">Concepto</span> <span class="info-value">${data.concepto}</span></div>
            </div>
        </div>

        ${data.descripcion ? `
        <div class="section">
            <div class="section-title">CONCEPTO Y DESCRIPCIÓN</div>
            <div class="description-box">
                ${data.descripcion}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">LISTA DE ARTÍCULOS</div>
            <table>
                <thead>
                    <tr>
                        <th width="20%">SKU</th>
                        <th width="60%">DESCRIPCIÓN</th>
                        <th width="20%" class="text-right">CANTIDAD</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.articulos.map(art => `
                        <tr>
                            <td class="info-value">${art.clave}</td>
                            <td>${art.nombre}</td>
                            <td class="text-right"><strong style="color:${data.accentColor}">${art.cantidad}</strong> <small style="color:#999">${art.unidad}</small></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="totals-area">
            <div class="total-row">
                <span class="total-label">Artículos Totales:</span>
                <span class="total-value">${data.totales.partidas}</span>
            </div>
            <div class="total-row">
                <span class="total-label">Unidades:</span>
                <span class="total-value">${data.totales.unidades}</span>
            </div>
            ${data.totales.monto !== undefined ? `
            <div class="total-row grand-total">
                <span class="total-label">TOTAL:</span>
                <span class="total-value">$${data.totales.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
        </div>

        <div class="footer-sign">
            <div class="signature-line"></div>
            <div class="signature-text">FIRMA DE RECIBIDO</div>
            <div style="font-size: 8px; color: #ccc; margin-top: 4px;">Validado mediante sistema biométrico</div>
        </div>

        <div class="footer-meta">
            <div>ID-TRANS: ${Math.random().toString(36).substring(2, 12).toUpperCase()}</div>
            <div>PÁGINA 1 DE 1</div>
        </div>
    </body>
    </html>
  `;
}

export async function generateAndSharePDF(data: PDFData) {
    const html = getPDFHtml(data);
    return generatePDFFromHtml(html, data.folio);
}

export async function generatePDFFromHtml(html: string, folio: string) {
    try {
        const { uri } = await Print.printToFileAsync({
            html,
            base64: false
        });

        if (Platform.OS === 'ios') {
            await Sharing.shareAsync(uri);
        } else {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Compartir ${folio}`,
                UTI: 'com.adobe.pdf'
            });
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}
