import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { discoveredJobs, discoveryPreferences } from '@/db/schema';
import { fetchDiscoveryFeeds, sourceOwnsJobUrl } from '@/lib/discovery-feed';
import { discoveryFingerprint } from '@/lib/job-discovery';
import { normalizeUrl } from '@/lib/job-import';
import { blockPublicDemoMutation } from '@/lib/public-demo';

// Single-user local service: bound requests and avoid accidental repeated network calls.
let running = false;
let lastFinished = 0;
export async function POST() {
  const blocked = blockPublicDemoMutation(); if (blocked) return blocked;
  if (running) return NextResponse.json({error:'正在获取岗位，请等待本次完成'}, {status:409});
  if (Date.now()-lastFinished < 60_000) return NextResponse.json({error:'刚刚获取过官网岗位，请一分钟后再试；现在可以点击“换一批”浏览已有候选'}, {status:429});
  running=true;
  try {
    const db=getDb();
    const prefs=await db.select().from(discoveryPreferences).where(eq(discoveryPreferences.id,'default')).limit(1);
    let cities:string[]=[];
    try {const v=JSON.parse(prefs[0]?.preferredCities || '[]');if(Array.isArray(v)) cities=v.filter(x=>typeof x==='string');} catch { /* Missing preferences do not invent constraints. */ }
    const results=await fetchDiscoveryFeeds(cities);
    const existing=await db.select().from(discoveredJobs);
    const known=new Map(existing.map(job=>[discoveryFingerprint(job),job]));
    const now=new Date().toISOString();let imported=0,updated=0;
    const sources=[];
    for (const result of results) {
      let added=0,refreshed=0,failed=0,closed=0;
      const scoped=new Set(result.jobs.map(discoveryFingerprint));
      for (const row of result.allJobs.filter(row=>scoped.has(discoveryFingerprint(row)) || known.has(discoveryFingerprint(row)))) {
        try {
          const fingerprint=discoveryFingerprint(row),previous=known.get(fingerprint);
          const data={company:row.company || '',position:row.position || '',department:row.department || '',category:row.category || '其他',
            location:row.location || '',recruitmentType:row.recruitmentType || '',description:row.description || '',requirements:row.requirements || '',
            jobUrl:row.jobUrl || '',normalizedUrl:normalizeUrl(row.jobUrl || ''),source:row.source || '',sourceKind:'official',sourceJobId:row.sourceJobId || '',
            publishedDate:row.publishedDate || '',deadline:row.deadline || '',graduationRequirement:row.graduationRequirement || '',startDate:row.startDate || '',
            rawText:row.rawText || '',availabilityStatus:row.availabilityStatus || 'active',lastSeenAt:now,fetchedAt:now,sourceUpdatedAt:row.sourceUpdatedAt || '',updatedAt:now};
          if(previous) {await db.update(discoveredJobs).set(data).where(eq(discoveredJobs.id,previous.id));refreshed++;}
          else {
            const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint));
            const id='feed-'+Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
            const record={...data,id,firstSeenAt:now,createdAt:now};
            const inserted=await db.insert(discoveredJobs).values(record).onConflictDoNothing().returning({id:discoveredJobs.id});
            if(inserted.length) added++;
            known.set(fingerprint,record);
          }
        } catch {failed++;}
      }
      // Only a successful, completely parsed full listing can mark missing jobs closed.
      if(!result.error && !result.invalid) {
        const seen=new Set(result.seenIds);
        for(const previous of existing.filter(job=>job.sourceKind==='official' && sourceOwnsJobUrl(result.source,job.jobUrl))) {
          if(!seen.has(previous.sourceJobId) && previous.availabilityStatus!=='possibly_closed') {
            await db.update(discoveredJobs).set({availabilityStatus:'possibly_closed',fetchedAt:now,updatedAt:now}).where(eq(discoveredJobs.id,previous.id));closed++;
          }
        }
      }
      imported+=added;updated+=refreshed;
      sources.push({company:result.source.company,scanned:result.scanned,matched:result.jobs.length,added,closed,updated:refreshed,
        failed:failed+result.invalid,error:result.error});
    }
    lastFinished=Date.now();
    return NextResponse.json({imported,updated,sources,checkedAt:now});
  } catch {
    return NextResponse.json({error:'获取岗位暂时失败，已保存的岗位与投递记录仍保留'}, {status:503});
  } finally {running=false;}
}
