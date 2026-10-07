"use client";
import React, { useState, useEffect } from 'react';
import { Search, Sliders, FileText, Send, CheckCircle2, UserCheck, ExternalLink, Sparkles, Loader2, Camera, X, CheckCircle, CheckSquare, Square, Printer } from 'lucide-react';

export default function JobSearchPWA() {
  const [activeTab, setActiveTab] = useState<'search' | 'customization' | 'resume' | 'apply' | 'status'>('search');
  const [selectedUser, setSelectedUser] = useState('Florian Francis');
  
  const [searchLoading, setSearchLoading] = useState(false);
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  // Region Filter Tab State matching your 8 master templates
  const [selectedRegionTab, setSelectedRegionTab] = useState<string>('All');

  // Batch Selection State
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Modal States
  const [photoModalConfig, setPhotoModalConfig] = useState<{ isOpen: boolean; templateTitle: string; templateId: string } | null>(null);
  const [alertModalConfig, setAlertModalConfig] = useState<{ isOpen: boolean; title: string; message: string; type?: 'success' | 'error' } | null>(null);

  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [targetRole, setTargetRole] = useState('Head / Director of Learning & Development');
  const [locations, setLocations] = useState('Bangalore, Remote');

  const [dashboardMetrics, setDashboardMetrics] = useState({ pending: 0, autoApplied: 0, interviews: 0, rejected: 0, total: 0 });
  const [applicationsList, setApplicationsList] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedUser]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/auto-apply');
      const data = await res.json();
      if (data.success) {
        setDashboardMetrics(data.metrics);
        setApplicationsList(data.applications.filter((app: any) => app.User === selectedUser));
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics');
    }
  };

  const handleFetchJobs = async () => {
    setSearchLoading(true);
    try {
      const response = await fetch('/api/match-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: selectedUser })
      });
      const data = await response.json();
      if (data.success) {
        setMatchedJobs(data.jobs);
      } else {
        setAlertModalConfig({ isOpen: true, title: 'Matching Error', message: data.error, type: 'error' });
      }
    } catch (err) {
      setAlertModalConfig({ isOpen: true, title: 'Connection Failed', message: 'Failed to connect to matching engine.', type: 'error' });
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    if (selectedJobIds.includes(jobId)) {
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
    }
  };

  // Helper to detect specific region classification from job location
  const getJobRegionCategory = (job: any) => {
    const loc = (job.Location || '').toLowerCase();
    if (
      loc.includes('uae') || 
      loc.includes('dubai') || 
      loc.includes('abu dhabi') || 
      loc.includes('sharjah') || 
      loc.includes('united arab emirates') || 
      loc.includes('middle east') || 
      loc.includes('bahrain') || 
      loc.includes('oman')
    ) {
      return 'Middle East';
    }
    if (loc.includes('singapore')) return 'Singapore';
    if (loc.includes('malaysia')) return 'Malaysia';
    if (loc.includes('netherlands') || loc.includes('norway') || loc.includes('sweden')) return 'Netherlands & Nordics';
    if (loc.includes('germany') || loc.includes('austria') || loc.includes('switzerland') || loc.includes('dach')) return 'DACH';
    if (loc.includes('france') || loc.includes('belgium')) return 'Western Europe';
    if (loc.includes('uk') || loc.includes('united kingdom') || loc.includes('scotland') || loc.includes('ireland') || loc.includes('northern ireland') || loc.includes('london')) return 'United Kingdom';
    return 'India';
  };

  const getSelectedJobs = () => matchedJobs.filter(j => selectedJobIds.includes(j.Job_ID));

  // Check if selected jobs cross different region categories
  const hasCrossRegionSelection = () => {
    const selected = getSelectedJobs();
    if (selected.length <= 1) return false;
    const firstCat = getJobRegionCategory(selected[0]);
    return selected.some(j => getJobRegionCategory(j) !== firstCat);
  };

  // Filtered jobs based on selected region tab
  const filteredMatchedJobs = matchedJobs.filter(job => {
    if (selectedRegionTab === 'All') return true;
    return getJobRegionCategory(job) === selectedRegionTab;
  });

  const handleBatchApply = async () => {
    const jobsToApply = getSelectedJobs();
    if (jobsToApply.length === 0 || hasCrossRegionSelection()) return;

    for (const job of jobsToApply) {
      const regionCat = getJobRegionCategory(job);
      const isME = regionCat === 'Middle East' || regionCat === 'DACH';
      await fetch('/api/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: selectedUser,
          jobTitle: job.Job_Title,
          company: job.Company,
          portalUrl: job.Portal_URL,
          regionTheme: regionCat,
          includePhoto: isME
        })
      });
    }

    setAlertModalConfig({
      isOpen: true,
      title: 'Batch Queue Successful!',
      message: `Successfully queued ${jobsToApply.length} region-matched jobs for ${selectedUser}!`,
      type: 'success'
    });

    setSelectedJobIds([]);
    fetchDashboardData();
  };

  const handleAutoApply = async (job: any) => {
    setApplyingJobId(job.Job_ID);
    try {
      const regionCat = getJobRegionCategory(job);
      const isME = regionCat === 'Middle East' || regionCat === 'DACH';
      const res = await fetch('/api/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: selectedUser,
          jobTitle: job.Job_Title,
          company: job.Company,
          portalUrl: job.Portal_URL,
          regionTheme: regionCat,
          includePhoto: isME
        })
      });
      const data = await res.json();
      if (data.success) {
        setAlertModalConfig({
          isOpen: true,
          title: 'Auto-Applied Successfully!',
          message: `Successfully queued and auto-applied to ${job.Company} for ${job.Job_Title}!`,
          type: 'success'
        });
        fetchDashboardData();
      } else {
        setAlertModalConfig({ isOpen: true, title: 'Application Failed', message: data.error, type: 'error' });
      }
    } catch (err) {
      setAlertModalConfig({ isOpen: true, title: 'Connection Failed', message: 'Failed to connect to auto-apply queue.', type: 'error' });
    } finally {
      setApplyingJobId(null);
    }
  };

  // Master Template Print-to-PDF Generator matching exact region configs
  const handleViewTailoredResume = (job: any) => {
    const companyClean = (job.Company || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Florian-Francis_${companyClean}.pdf`;
    
    const regionCat = getJobRegionCategory(job);
    const requirePhoto = regionCat === 'Middle East' || regionCat === 'DACH' || regionCat === 'Malaysia';
    const photoText = requirePhoto ? 'Headshot: Required / Expected[cite: 17]' : 'Strictly Photo-Free[cite: 17, 18]';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; line-height: 1.4; padding: 30px; max-width: 800px; margin: 0 auto; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 15px; margin-bottom: 20px; }
            .profile-info h1 { margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px; }
            .profile-info p { margin: 3px 0; color: #333; font-size: 12px; }
            .section-title { font-size: 13px; font-weight: bold; color: #111; border-bottom: 1px solid #333; padding-bottom: 2px; margin-top: 18px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
            ul { margin: 0 0 10px 0; padding-left: 18px; }
            li { margin-bottom: 4px; font-size: 12px; }
            .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-top: 10px; font-size: 12px; }
            .badge { background: #f1f5f9; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; display: inline-block; margin-bottom: 16px; border: 1px solid #cbd5e1; }
            @media print { body { padding: 0; } .noprint { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="noprint" style="background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <span>📄 File Name: <strong>${fileName}</strong></span>
            <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ Save as PDF / Print</button>
          </div>

          <div class="header">
            <div class="profile-info">
              <h1>FLORIAN FRANCIS</h1>
              <p><strong>Head / Director - Learning & Development | Capability Building | Talent Enablement</strong></p>
              <p>Bangalore, India | +91 81237 25553 | florian.francis@icloud.com | LinkedIn</p>
            </div>
            <div>
              ${requirePhoto ? '<div style="width: 65px; height: 65px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #475569; text-align: center; border: 1px solid #cbd5e1;">Photo</div>' : '<div style="font-size: 11px; color: #64748b; font-style: italic;">ATS Clean</div>'}
            </div>
          </div>

          <div>
            <span class="badge">Region Template: ${regionCat} | Compliance: ${photoText}</span>
            <p style="margin: 2px 0 10px 0; font-size: 12px;"><strong>Target Role:</strong> ${job.Job_Title} at <strong>${job.Company}</strong></p>
          </div>

          <div class="section-title">Executive Summary</div>
          <p style="font-size: 12px; text-align: justify;">Senior Learning and Development leader with 15+ years of experience building capability ecosystems across Tech, Retail, F&B and enterprise environments, enabling consistent operational readiness across multi-location teams[cite: 15]. Proven expertise in designing structured learning journeys, uplifting frontline capability, and building academy-style development pathways that strengthen behavioural application and role readiness[cite: 15].</p>

          <div class="section-title">Core Capabilities</div>
          <p style="font-size: 12px;">
            <strong>Learning Systems & Digital Ecosystems:</strong> LMS/LXP administration, user journeys, system configurations[cite: 15].<br/>
            <strong>Learning Operations & Governance:</strong> SOP creation, governance frameworks, quarterly audits, compliance alignment[cite: 15].<br/>
            <strong>Learning Analytics & Reporting:</strong> Advanced Excel, dashboard creation, learning adoption metrics[cite: 15].<br/>
            <strong>Stakeholder Partnership:</strong> Aligning learning solutions with organizational priorities and operational realities[cite: 15].
          </p>

          <div class="section-title">Professional Experience</div>
          
          <div class="job-header"><span>Learning Advisory Leader | Excellify, Bangalore</span><span>Jan 2024 - Nov 2024[cite: 16]</span></div>
          <ul>
            <li>Conducted capability assessments and skill-gap analysis to translate performance gaps into structured learning interventions[cite: 16].</li>
            <li>Designed role-based learning pathways and academy-style development journeys for diverse business teams[cite: 16].</li>
          </ul>

          <div class="job-header"><span>Head - Human Capital | Halodoc LLC, Bangalore</span><span>Dec 2021 - Jun 2023[cite: 16]</span></div>
          <ul>
            <li>Built SME-led training ecosystems and certified 40+ internal trainers to scale learning delivery[cite: 16].</li>
            <li>Delivered manager and leadership development journeys integrating behavioural indicators and 360-degree insights[cite: 16].</li>
          </ul>

          <div class="job-header"><span>L&D Manager | Zeta Suite, Bangalore</span><span>Jul 2020 - Nov 2021[cite: 16]</span></div>
          <ul>
            <li>Implemented pre- and post-assessment frameworks to measure learning effectiveness and behavioural change[cite: 16].</li>
            <li>Revamped LMS and mobile learning platforms, reducing manual reporting effort and improving adoption to 85%[cite: 16].</li>
          </ul>

          <div class="section-title">Education & Certifications</div>
          <p style="font-size: 12px;">
            <strong>Certifications:</strong> CIPD Level 5 Associate Diploma (2025-2026); IIM Kozhikode HR Management & Analytics (2024)[cite: 16].<br/>
            <strong>Education:</strong> Bachelor's in Hotel Management - Presidency College, Bangalore University (2003)[cite: 16].
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isCrossRegion = hasCrossRegionSelection();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl font-bold">JS</div>
          <div>
            <h1 className="text-lg font-bold">Custom Job Engine & Auto-Apply PWA</h1>
            <p className="text-xs text-slate-500">Connected to Google Sheets Database</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <UserCheck size={16} className="text-blue-600" />
          <select 
            value={selectedUser} 
            onChange={(e) => {
              setSelectedUser(e.target.value);
              if (e.target.value.includes('Meera')) {
                setTargetRole('Senior Project Manager / Release Manager');
              } else {
                setTargetRole('Head / Director of Learning & Development');
              }
            }}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          >
            <option value="Florian Francis">Florian Francis (L&D)</option>
            <option value="Meera Gopinath Menon">Meera Gopinath Menon (Project Mgmt)</option>
          </select>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200 px-6 flex space-x-8 overflow-x-auto shadow-xs">
        {[
          { id: 'search', label: 'Job Search Engine', icon: Search },
          { id: 'customization', label: 'Customization', icon: Sliders },
          { id: 'resume', label: 'Resume & ATS', icon: FileText },
          { id: 'apply', label: 'Job Application', icon: Send },
          { id: 'status', label: 'Status Dashboard', icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold">Matched Job Listings</h2>
                <p className="text-xs text-slate-500">Tailored using resume experience and granular profile insights for {selectedUser}</p>
              </div>
              <div className="flex items-center space-x-3">
                {selectedJobIds.length > 0 && (
                  <div className="relative group">
                    <button 
                      disabled={isCrossRegion}
                      onClick={handleBatchApply}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2 ${
                        isCrossRegion 
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      <Send size={16} />
                      <span>Batch Queue ({selectedJobIds.length})</span>
                    </button>
                    {isCrossRegion && (
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                        Cannot batch across different region compliance standards. Please select jobs from the same region tab.
                      </div>
                    )}
                  </div>
                )}
                <button 
                  onClick={handleFetchJobs}
                  disabled={searchLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{searchLoading ? 'Analyzing & Matching...' : 'Fetch New Jobs from Portals'}</span>
                </button>
              </div>
            </div>

            {/* Comprehensive Region Filtering Tabs */}
            {matchedJobs.length > 0 && (
              <div className="flex space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
                {['All', 'India', 'Middle East', 'Singapore', 'Malaysia', 'Netherlands & Nordics', 'DACH', 'Western Europe', 'United Kingdom'].map((region) => (
                  <button
                    key={region}
                    onClick={() => setSelectedRegionTab(region)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                      selectedRegionTab === region 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {region} ({region === 'All' ? matchedJobs.length : matchedJobs.filter(j => getJobRegionCategory(j) === region).length})
                  </button>
                ))}
              </div>
            )}

            {filteredMatchedJobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center py-12">
                <Search size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700">No matched jobs loaded for "{selectedRegionTab}"</h3>
                <p className="text-sm text-slate-500 mt-1">Click "Fetch New Jobs from Portals" above or switch region tabs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredMatchedJobs.map((job, idx) => {
                  const isSelected = selectedJobIds.includes(job.Job_ID);
                  const isApplying = applyingJobId === job.Job_ID;
                  const regionCat = getJobRegionCategory(job);
                  return (
                    <div key={idx} className={`bg-white rounded-xl border p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                      <div className="flex items-start space-x-4">
                        <button 
                          onClick={() => toggleJobSelection(job.Job_ID)}
                          className="mt-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                        >
                          {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                        </button>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                            <h3 className="text-lg font-bold text-slate-900">{job.Job_Title}</h3>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              Match: {job.Match_Score}
                            </span>
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-2 py-0.5 rounded">
                              Region: {regionCat}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-blue-600">{job.Company} • <span className="text-slate-500">{job.Location}</span></p>
                          <p className="text-xs text-slate-600 max-w-2xl mt-2">{job.Description}</p>
                          <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                            <strong>Match Insight:</strong> {job.Match_Reason}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 w-full md:w-auto">
                        <a 
                          href={job.Portal_URL} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium text-center transition flex items-center justify-center space-x-1"
                        >
                          <span>View Portal</span>
                          <ExternalLink size={12} />
                        </a>
                        <button 
                          onClick={() => handleViewTailoredResume(job)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-xs font-medium text-center transition flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>View Tailored PDF</span>
                        </button>
                        <button 
                          disabled={isApplying}
                          onClick={() => handleAutoApply(job)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-xs flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          {isApplying && <Loader2 size={14} className="animate-spin" />}
                          <span>{isApplying ? 'Applying...' : 'Queue for Auto-Apply'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Other tabs */}
        {activeTab === 'customization' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold">Search Parameters & Profile Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Job Roles</label>
                <input 
                  type="text" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Locations</label>
                <input 
                  type="text" 
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                Save Configurations
              </button>
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Dynamic Resume Customizer & ATS Styling</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'Middle East (UAE, Oman, Bahrain)', title: 'Middle East', desc: 'Includes photo requirements, visa/nationality placeholders, high-status leadership tone.' },
                { id: 'Singapore', title: 'Singapore', desc: 'Compliance-oriented, concise layout with PR/Nationality quota readiness.' },
                { id: 'United Kingdom (UK Executive)', title: 'United Kingdom', desc: 'Photo-free, emphasizes executive governance (PMP, ITIL, CIPD).' },
                { id: 'Netherlands & Nordics (Norway/Sweden)', title: 'Netherlands / Nordics', desc: 'Strictly photo-free, egalitarian tone, strict 2-page brevity.' },
                { id: 'DACH (Germany, Austria, Switzerland)', title: 'DACH', desc: 'Includes professional headshot, structured chronological governance.' },
                { id: 'Indian Standard ATS', title: 'Indian', desc: 'Direct, authoritative tone detailing enterprise and multi-location scale.' }
              ].map((tmpl, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Region Template</span>
                    <h3 className="font-semibold text-slate-800 mt-2">{tmpl.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tmpl.desc}</p>
                  </div>
                  <button 
                    onClick={() => setAlertModalConfig({ isOpen: true, title: tmpl.title, message: `Template loaded for ${tmpl.title}. Select jobs in your search feed to print/download tailored PDFs.` })}
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition cursor-pointer"
                  >
                    View Config
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Application Status Dashboard</h2>
                <p className="text-xs text-slate-500">Live metrics synced from Google Sheets for {selectedUser}</p>
              </div>
              <button onClick={fetchDashboardData} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer">
                Refresh Metrics
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{dashboardMetrics.pending}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Auto-Applied</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{dashboardMetrics.autoApplied}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Interviews</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboardMetrics.interviews}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{dashboardMetrics.rejected}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-slate-200"><h3 className="font-bold text-slate-800">Pipeline Activity Log</h3></div>
              {applicationsList.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No application activity recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Job Role</th>
                        <th className="px-6 py-3">Match Score</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {applicationsList.map((app, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3">{app.Date || '2026-05-22'}</td>
                          <td className="px-6 py-3 font-semibold">{app.Company || 'Global Tech'}</td>
                          <td className="px-6 py-3">{app["Job Role"] || app.Job_Title}</td>
                          <td className="px-6 py-3 font-medium text-emerald-600">
                            {typeof app["Match Score"] === 'number' || !String(app["Match Score"]).includes('%') 
                              ? `${Math.round(parseFloat(app["Match Score"]) * 100)}%` : app["Match Score"]}
                          </td>
                          <td className="px-6 py-3">
                            <select
                              defaultValue={app.Status || 'Active'}
                              onChange={async (e) => {
                                await fetch('/api/auto-apply', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ user: selectedUser, jobTitle: app["Job Role"], company: app.Company, statusUpdate: e.target.value })
                                });
                                fetchDashboardData();
                              }}
                              className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-medium cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Auto-Applied">Auto-Applied</option>
                              <option value="Next round">Next round</option>
                              <option value="Interview">Interview</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertModalConfig?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-6 relative">
            <button onClick={() => setAlertModalConfig(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><CheckCircle size={24} /></div>
              <div><h3 className="text-lg font-bold text-slate-900">{alertModalConfig.title}</h3></div>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">{alertModalConfig.message}</p>
            <button onClick={() => setAlertModalConfig(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium cursor-pointer">Close</button>
          </div>
        </div>
      )}
    </main>
  );
}