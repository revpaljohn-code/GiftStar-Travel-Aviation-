import { BookingRecord, GeneratedItinerary } from '../types/travel';

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendBookingConfirmationEmail(
  accessToken: string,
  params: {
    toEmail: string;
    toName: string;
    subject: string;
    bookingRef: string;
    itemTitle: string;
    destination: string;
    travelDate: string;
    guests: number;
    totalUsd: number;
    customMessage?: string;
    googleDocUrl?: string;
  }
): Promise<{ id: string; threadId: string }> {
  const bodyLines = [
    `Dear ${params.toName},`,
    '',
    `Thank you for choosing Giftstar Travel Aviation ("From Junub To The World").`,
    `Your travel request has been registered with the details below:`,
    '',
    `Booking Reference: ${params.bookingRef}`,
    `Itinerary / Service: ${params.itemTitle}`,
    `Destination: ${params.destination}`,
    `Departure Date: ${params.travelDate}`,
    `Travelers: ${params.guests}`,
    `Estimated Total: $${params.totalUsd.toLocaleString()} USD`,
    ...(params.googleDocUrl ? ['', `Downloadable Itinerary (Google Docs): ${params.googleDocUrl}`] : []),
    ...(params.customMessage ? ['', `Concierge Note: ${params.customMessage}`] : []),
    '',
    'For urgent aviation dispatch, visa coordination, or air charter inquiries:',
    'Giftstar Travel Aviation — Juba, Airport Road, South Sudan',
    'Tel: +211 989 991 000 | +211 920 548 083',
    'Email: travelaviation@giftstartravellc.com',
  ];

  const mimeMessage = [
    `To: ${params.toEmail}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyLines.join('\r\n'),
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlEncode(mimeMessage),
    }),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload?.error?.message || `Gmail send failed (${res.status}).`);
  }

  return res.json();
}

export async function createItineraryGoogleDoc(
  accessToken: string,
  params: {
    title: string;
    travelerName: string;
    bookingRef?: string;
    destination: string;
    travelDate?: string;
    itinerary?: GeneratedItinerary;
    summaryText?: string;
  }
): Promise<{ documentId: string; documentUrl: string }> {
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Giftstar Itinerary — ${params.title}`,
    }),
  });

  if (!createRes.ok) {
    const errPayload = await createRes.json().catch(() => ({}));
    throw new Error(errPayload?.error?.message || `Google Docs create failed (${createRes.status}).`);
  }

  const createdDoc = await createRes.json();
  const documentId = createdDoc.documentId as string;

  const sections: string[] = [
    'GIFTSTAR TRAVEL AVIATION — OFFICIAL TRAVEL ITINERARY\n',
    'From Junub To The World | Juba, Airport Road | +211 989 991 000\n\n',
    `Prepared For: ${params.travelerName}\n`,
    ...(params.bookingRef ? [`Booking Reference: ${params.bookingRef}\n`] : []),
    `Destination: ${params.destination}\n`,
    ...(params.travelDate ? [`Departure Date: ${params.travelDate}\n`] : []),
    '\n',
  ];

  if (params.itinerary) {
    sections.push(`${params.itinerary.title}\n`);
    sections.push(`${params.itinerary.summary}\n\n`);
    sections.push(`Recommended Routing: ${params.itinerary.recommendedAirline}\n`);
    sections.push(`Recommended Stay: ${params.itinerary.recommendedHotel}\n`);
    sections.push(`Visa & Transfer Advisory: ${params.itinerary.visaAdvisory}\n\n`);
    sections.push('ESTIMATED INVESTMENT BREAKDOWN\n');
    sections.push(`• Flights: $${params.itinerary.estimatedBreakdown.flightsUsd.toLocaleString()} USD\n`);
    sections.push(`• Accommodation: $${params.itinerary.estimatedBreakdown.accommodationUsd.toLocaleString()} USD\n`);
    sections.push(`• Experiences & Dining: $${params.itinerary.estimatedBreakdown.experiencesAndDiningUsd.toLocaleString()} USD\n`);
    sections.push(`• Transfers & Concierge: $${params.itinerary.estimatedBreakdown.transfersAndConciergeUsd.toLocaleString()} USD\n\n`);
    sections.push('DAY-BY-DAY SCHEDULE\n');
    params.itinerary.days.forEach((day) => {
      sections.push(`\nDay ${day.dayNumber}: ${day.theme} (${day.highlightStop.name})\n`);
      sections.push(`  Morning: ${day.morning}\n`);
      sections.push(`  Afternoon: ${day.afternoon}\n`);
      sections.push(`  Evening: ${day.evening}\n`);
    });
  } else if (params.summaryText) {
    sections.push('BOOKING & SERVICE SUMMARY\n');
    sections.push(`${params.summaryText}\n`);
  }

  sections.push('\n—\nGiftstar Travel Aviation Concierge | travelaviation@giftstartravellc.com\n');

  const fullText = sections.join('');

  const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: fullText,
          },
        },
        {
          updateParagraphStyle: {
            range: { startIndex: 1, endIndex: 52 },
            paragraphStyle: { namedStyleType: 'HEADING_1' },
            fields: 'namedStyleType',
          },
        },
      ],
    }),
  });

  if (!batchRes.ok) {
    const errPayload = await batchRes.json().catch(() => ({}));
    throw new Error(errPayload?.error?.message || `Google Docs formatting failed (${batchRes.status}).`);
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

export async function exportGoogleDocAsPdf(
  accessToken: string,
  documentId: string,
  filename: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=application/pdf`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload?.error?.message || `Drive PDF export failed (${res.status}).`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function syncBookingsToGoogleSheet(
  accessToken: string,
  bookings: BookingRecord[],
  existingSpreadsheetId?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowCount: number }> {
  let spreadsheetId = existingSpreadsheetId;
  let sheetTitle = 'Bookings';

  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Giftstar Travel Aviation — Bookings & Customer Records',
        },
        sheets: [
          {
            properties: {
              title: 'Bookings',
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const errPayload = await createRes.json().catch(() => ({}));
      throw new Error(errPayload?.error?.message || `Google Sheets create failed (${createRes.status}).`);
    }

    const created = await createRes.json();
    spreadsheetId = created.spreadsheetId as string;
    sheetTitle = created.sheets?.[0]?.properties?.title || 'Bookings';
  } else {
    // Always fetch spreadsheet metadata first to determine actual tab name
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      const errPayload = await metaRes.json().catch(() => ({}));
      throw new Error(errPayload?.error?.message || `Failed to inspect Google Sheet (${metaRes.status}).`);
    }
    const meta = await metaRes.json();
    sheetTitle = meta.sheets?.[0]?.properties?.title || 'Bookings';
  }

  const headerRow = [
    'Booking Ref',
    'Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Type',
    'Itinerary / Service',
    'Destination',
    'Departure Date',
    'Travelers',
    'Cabin / Tier',
    'Total (USD)',
    'Google Doc URL',
  ];

  const dataRows = bookings.map((b) => [
    b.bookingRef,
    b.status.toUpperCase(),
    b.customerName,
    b.customerEmail,
    b.customerPhone,
    b.bookingType,
    b.itemTitle,
    b.destination,
    b.travelDate,
    String(b.guests),
    b.cabinOrTier,
    String(b.totalUsd),
    b.googleDocUrl || '',
  ]);

  const values = [headerRow, ...dataRows];
  const encodedRange = encodeURIComponent(`'${sheetTitle}'!A1`);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    const errPayload = await updateRes.json().catch(() => ({}));
    throw new Error(errPayload?.error?.message || `Google Sheets update failed (${updateRes.status}).`);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rowCount: dataRows.length,
  };
}
