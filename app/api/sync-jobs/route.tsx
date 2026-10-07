import { NextResponse } from 'next/server';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQoW_0dSKUFE7YFZr7ME-n-Pml3EKS0bMVWEriEfktEvf6vlv-Dq13dssXMoTGGiaV/exec';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profile, jobs } = body; 

    if (!WEB_APP_URL) {
      return NextResponse.json({ error: 'Google Sheets Web App URL not configured' }, { status: 500 });
    }

    const targetSheet = profile || 'Jobs_Florian';
    const results = [];

    for (const job of jobs) {
      const payload = {
        sheet: targetSheet,
        row: {
          Job_ID: `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          Job_Title: job.Job_Title,
          Company: job.Company,
          Location: job.Location,
          Visa_Sponsorship: job.Visa_Sponsorship || 'Not Specified',
          Portal_URL: job.Portal_URL,
          Match_Score: job.Match_Score,
          Match_Reason: job.Match_Reason,
          Description: job.Description || '',
          Date_Scraped: new Date().toISOString().split('T')[0]
        }
      };

      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let resData;
      try {
        resData = JSON.parse(responseText);
      } catch (e) {
        // If Google Apps Script returns an HTML redirect page instead of JSON
        console.error("Google Script returned non-JSON response:", responseText);
        return NextResponse.json({ error: 'Google Apps Script Web App returned non-JSON (likely permission/deployment redirect error)', details: responseText }, { status: 500 });
      }

      results.push(resData);
    }

    return NextResponse.json({ success: true, syncedRows: results.length });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}