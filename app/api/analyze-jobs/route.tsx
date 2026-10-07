import { NextResponse } from 'next/server';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQoW_0dSKUFE7YFZr7ME-n-Pml3EKS0bMVWEriEfktEvf6vlv-Dq13dssXMoTGGiaV/exec';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, rawJobs } = body;

    if (!user || !rawJobs || !Array.isArray(rawJobs)) {
      return NextResponse.json({ success: false, error: 'User and rawJobs array are required' }, { status: 400 });
    }

    // Dynamically select the correct user profile tab and job target tab
    const isMeera = user.includes('Meera');
    const profileTab = isMeera ? 'Profile_Data_Meera' : 'Profile_Data_Florian';
    const targetJobsTab = isMeera ? 'Jobs_Meera' : 'Jobs_Florian';

    // 1. Fetch Candidate Profile Data from Google Sheets
    const profileRes = await fetch(`${WEB_APP_URL}?sheet=${profileTab}`);
    const profileText = await profileRes.text();
    let profileData = [];
    try {
      profileData = JSON.parse(profileText);
    } catch (e) {
      console.warn("Failed to parse profile data. Using empty array.");
    }
    
    const userProfile = Array.isArray(profileData) ? profileData : [];
    const candidateSummary = userProfile.map((item: any) => `${item.Category || ''}: ${item.Key || ''} - ${item.Value || ''}`).join('\n');

    // 2. Call Claude API with valid production model
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '', 
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // Valid production model
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are an expert career matching engine. 
          Here is the candidate profile:
          ${candidateSummary}

          Here are the raw scraped job descriptions to analyze:
          ${JSON.stringify(rawJobs)}

          For each job, calculate a match score percentage (e.g., "94%"), extract key requirements, and write a concise match reason.
          Return ONLY a valid JSON array of objects with keys: Job_Title, Company, Location, Description, Portal_URL, Match_Score, Match_Reason. No conversational text.`
        }]
      })
    });

    const claudeResult = await claudeResponse.json();
    
    if (claudeResult.type === 'error' || claudeResult.error) {
      return NextResponse.json({ 
        success: false, 
        error: `Claude API Error: ${claudeResult.error?.message || 'Unknown Auth/Credit Error'}`,
        rawClaude: claudeResult
      });
    }

    const contentText = claudeResult.content?.[0]?.text || '[]';
    
    let cleanJsonText = '[]';
    const jsonMatch = contentText.match(/\[[\s\S]*\]/); 
    if (jsonMatch) {
      cleanJsonText = jsonMatch[0];
    }
    
    let scoredJobs = [];
    try {
      scoredJobs = JSON.parse(cleanJsonText);
    } catch (parseError) {
      return NextResponse.json({ success: false, error: "Failed to parse Claude's response as JSON.", rawText: contentText });
    }

    if (scoredJobs.length === 0) {
       return NextResponse.json({ success: false, error: "Claude returned an empty array.", rawText: contentText });
    }

    // 3. Sync directly to user-specific jobs tab (Jobs_Florian or Jobs_Meera)
    for (const job of scoredJobs) {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: targetJobsTab,
          row: {
            Job_ID: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
            Job_Title: job.Job_Title,
            Company: job.Company,
            Location: job.Location || 'Remote',
            Description: job.Description,
            Portal_URL: job.Portal_URL || 'https://example.com',
            Match_Score: job.Match_Score,
            Match_Reason: job.Match_Reason
          }
        })
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Jobs successfully analyzed by Claude and synced to ${targetJobsTab}!`,
      scoredJobs 
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}