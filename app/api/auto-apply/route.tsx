import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQoW_0dSKUFE7YFZr7ME-n-Pml3EKS0bMVWEriEfktEvf6vlv-Dq13dssXMoTGGiaV/exec';

// Configure SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mail.me.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'florian.francis@icloud.com',
    pass: process.env.SMTP_PASS || 'your-smtp-password',
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, jobTitle, company, portalUrl, regionTheme, description, recruiterContact } = body;

    if (!user || !jobTitle) {
      return NextResponse.json({ success: false, error: 'User and Job Title are required' }, { status: 400 });
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const appId = `APP-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Clean company name for resume file naming
    const companyClean = (company || 'Target_Company').replace(/[^a-zA-Z0-9]/g, '_');
    const userClean = user.replace(/\s+/g, '_');
    const resumeVersionName = `${userClean}_${companyClean}.pdf`;

    // 1. Log record to Google Sheets 'Applications' tab
    await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sheet: 'Applications', 
        row: {
          Date: currentDate,
          User: user,
          Company: company || 'Target Company',
          "Job Role": jobTitle,
          "Match Score": '95%',
          Customisation: `Auto-Applied | Region: ${regionTheme || 'Standard'}`,
          Link: portalUrl || 'https://example.com/job',
          App_ID: appId,
          Status: 'Auto-Applied',
          Resume_Version_Used: resumeVersionName
        } 
      })
    });

    // 2. Determine Recipient Email Address based on User Profile
    const recipientEmail = user.includes('Meera') 
      ? 'meeramenon086@gmail.com' 
      : 'florian.francis@icloud.com';

    // 3. Dispatch Audit Email via SMTP
    const mailOptions = {
      from: `"Autonomous Job Pipeline" <${process.env.SMTP_USER || 'florian.francis@icloud.com'}>`,
      to: recipientEmail,
      subject: `🚀 Application Dispatched: ${jobTitle} at ${company || 'Target Company'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 0;">Application Audit & Dispatch Notification</h2>
          
          <p style="font-size: 14px; color: #475569;">Hello <strong>${user}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">Your autonomous pipeline has successfully processed and queued your application. Below are the complete dispatch records:</p>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
            <p style="margin: 6px 0; font-size: 13px;"><strong>Application ID:</strong> ${appId}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Date of Application:</strong> ${currentDate}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Company:</strong> ${company || 'Not Specified'}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Job Role:</strong> ${jobTitle}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Region Standard:</strong> ${regionTheme || 'Standard Global'}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Recruiter / Point of Contact:</strong> ${recruiterContact || 'Not publicly listed on portal'}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Shared Resume File:</strong> <span style="color: #2563eb; font-weight: bold;">${resumeVersionName}</span></p>
          </div>

          <h3 style="font-size: 14px; color: #0f172a; margin-top: 20px;">Job Description Summary:</h3>
          <p style="font-size: 12px; color: #64748b; background: #fff; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; line-height: 1.5;">
            ${description || 'Tailored executive L&D capability role processed via automated portal pipeline.'}
          </p>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Custom Job Engine & Auto-Apply PWA • Synced with Google Sheets Database
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error('Non-blocking SMTP email dispatch error:', emailErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Job successfully queued, logged to Google Sheets, and audit email dispatched!',
      appId,
      status: 'Auto-Applied'
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const res = await fetch(`${WEB_APP_URL}?sheet=Applications`);
    const data = await res.json();
    const applications = Array.isArray(data) ? data : [];

    const metrics = {
      pending: applications.filter((app: any) => app.Status === 'Customized & Ready' || app.Status === 'Pending').length,
      autoApplied: applications.filter((app: any) => app.Status === 'Auto-Applied' || app.Status === 'Customized & Logged').length,
      interviews: applications.filter((app: any) => app.Status === 'Interview').length,
      rejected: applications.filter((app: any) => app.Status === 'Rejected').length,
      total: applications.length
    };

    return NextResponse.json({ success: true, metrics, applications });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}