import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

// Simple PDF text extraction - in production, use a proper PDF library
// This is a basic implementation that works for text-based PDFs

export async function extractTextFromPDF(uri: string): Promise<string> {
  try {
    // For Expo, we need to read the file as base64 and extract text
    // A full implementation would use pdf-lib or similar
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });

    // Basic PDF text extraction (very simplified)
    // Look for text between BT and ET markers
    const textContent = extractPdfTextBasic(base64);

    if (textContent.trim().length > 0) {
      return textContent;
    }

    // Fallback: return a message indicating the PDF needs proper processing
    return `[PDF file detected: ${Math.round(base64.length / 1024)} KB. Full text extraction requires server-side processing. Please use a .txt or .md file instead, or wait for the PDF feature to be fully implemented.]`;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Could not extract text from PDF");
  }
}

function extractPdfTextBasic(base64: string): string {
  // Decode the base64 to get the PDF content
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert to string for regex matching
  const content = new TextDecoder().decode(bytes);

  // Extract text between BT (begin text) and ET (end text) markers
  const textPatterns = content.match(/BT[\s\S]*?ET/g) || [];

  const extractedTexts: string[] = [];
  for (const block of textPatterns) {
    // Look for Tj and TJ operators which contain the actual text
    const textMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
    for (const match of textMatches) {
      const text = match.match(/\(([^)]*)\)/);
      if (text && text[1]) {
        extractedTexts.push(text[1]);
      }
    }

    // Also check for TJ arrays
    const tjMatches = block.match(/\[[\s\S]*?\]\s*TJ/g) || [];
    for (const match of tjMatches) {
      const innerTexts = match.matchAll(/\(([^)]*)\)/g);
      for (const t of innerTexts) {
        if (t[1]) {
          extractedTexts.push(t[1]);
        }
      }
    }
  }

  return extractedTexts.join(" ").replace(/\s+/g, " ").trim();
}

export async function pickAndExtractPDF(): Promise<{ title: string; text: string } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const file = result.assets[0];
    const text = await extractTextFromPDF(file.uri);

    return {
      title: file.name.replace(/\.pdf$/i, ""),
      text,
    };
  } catch (error) {
    console.error("PDF pick error:", error);
    throw error;
  }
}

// In production, you would use a proper PDF library like pdf-lib
// npm install pdf-lib
// import { PDFDocument } from 'pdf-lib';

/*
async function extractWithPdfLib(uri: string): Promise<string> {
  const fileBytes = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const pdfDoc = await PDFDocument.load(base64ToBytes(fileBytes));
  const pages = pdfDoc.getPages();
  const text = pages.map(page => {
    const textContent = page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  }).join('\n\n');
  return text;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
*/
