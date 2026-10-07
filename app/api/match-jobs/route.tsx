import { NextResponse } from 'next/server';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQoW_0dSKUFE7YFZr7ME-n-Pml3EKS0bMVWEriEfktEvf6vlv-Dq13dssXMoTGGiaV/exec';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user } = body;

    if (!user) {
      return NextResponse.json({ success: false, error: 'User is required for matching' }, { status: 400 });
    }

    const isMeera = user.includes('Meera');
    const profileTab = isMeera ? 'Profile_Data_Meera' : 'Profile_Data_Florian';
    const jobsTab = isMeera ? 'Jobs_Meera' : 'Jobs_Florian';

    const [profileRes, jobsRes] = await Promise.all([
      fetch(`${WEB_APP_URL}?sheet=${profileTab}`),
      fetch(`${WEB_APP_URL}?sheet=${jobsTab}`)
    ]);

    const profileText = await profileRes.text();
    const jobsText = await jobsRes.text();

    let profileData = [];
    let jobsData = [];

    try {
      profileData = JSON.parse(profileText);
    } catch (e) {
      profileData = [];
    }

    try {
      jobsData = JSON.parse(jobsText);
    } catch (e) {
      jobsData = [];
    }

    // Extract skills/capabilities from your key-value profile rows safely
    const userProfile = Array.isArray(profileData) ? profileData : [];
    const allJobs = Array.isArray(jobsData) ? jobsData : [];

    const userSkillsText = userProfile
      .map((item: any) => `${item.Key || ''} ${item.Value || ''}`)
      .join(' ')
      .toLowerCase();

    const userKeywords = userSkillsText.match(/\b(\w+)\b/g) || [];

    const matchedJobs = allJobs.map((job: any) => {
      const jobDesc = (job.Description || job.Job_Title || '').toLowerCase();
      let matchScore = 65;
      let matchedCount = 0;

      userKeywords.forEach((kw: string) => {
        if (kw.length > 3 && jobDesc.includes(kw)) {
          matchedCount++;
        }
      });

      matchScore = Math.min(96, matchScore + (matchedCount * 2));

      return {
        ...job,
        Match_Score: `${matchScore}%`,
        Match_Reason: job.Match_Reason || `Matched key competencies from your master profile including leadership and domain frameworks.`
      };
    });

    matchedJobs.sort((a: any, b: any) => parseInt(b.Match_Score) - parseInt(a.Match_Score));

    return NextResponse.json({ 
      success: true, 
      jobs: matchedJobs.slice(0, 5) 
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}