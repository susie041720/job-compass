import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTOMATIC_SOURCES } from '../lib/discovery-catalog.ts';
import { feedRowToJob, fetchDiscoveryFeeds, fetchSourceFeed, matchesFeedScope } from '../lib/discovery-feed.ts';
import { nextDiscoveryBatch, recommendable } from '../lib/discovery-batch.ts';
const lever=AUTOMATIC_SOURCES.find(s=>s.id==='ekimetrics')!;
const row={id:'test-id',text:'Business Scientist Internship',categories:{location:'Hong Kong',team:'Analytics',commitment:'Internship'},descriptionPlain:'Work with marketing data.',lists:[{text:'Requirements',content:'<li>Student with SQL</li>'}],createdAt:Date.parse('2026-10-01')};
test('公开岗位保留原文与来源，不把抓取时间当发布时间',()=>{
 const job=feedRowToJob(lever,row);assert.equal(job.recruitmentType,'实习');assert.match(job.rawText!,/Student with SQL/);assert.equal(job.publishedDate,'');assert.equal(job.jobUrl,'https://jobs.lever.co/ekimetrics/test-id');
 assert.equal(feedRowToJob(lever,{...row,createdAt:undefined}).publishedDate,'');
});
test('深圳香港实习筛选不混入全职或海外岗位，不按正文中的 intern 误分类',()=>{
 const job=feedRowToJob(lever,row);assert.ok(matchesFeedScope(job,['深圳','香港']));
 assert.ok(!matchesFeedScope({...job,location:'Paris'},['香港']));
 assert.ok(!matchesFeedScope({...job,position:'Senior Analyst',recruitmentType:'Full-time'},['香港']));
 assert.equal(feedRowToJob(lever,{...row,text:'Senior Analyst',categories:{commitment:'Full-time'},descriptionPlain:'Manage interns'}).recruitmentType,'Full-time');
});
test('部分来源失败不影响其他来源，格式变化明确报错',async()=>{
 const fake=(async(input:RequestInfo|URL)=> String(input).includes('/ekimetrics') ? Response.json([row]) : new Response('',{status:429})) as typeof fetch;
 const results=await fetchDiscoveryFeeds(['香港'],fake);assert.equal(results.find(r=>r.source.id==='ekimetrics')!.jobs.length,1);assert.equal(results.filter(r=>r.error).length,AUTOMATIC_SOURCES.length-1);
 await assert.rejects(()=>fetchSourceFeed(lever,[],async()=>Response.json({error:'blocked'})),/格式改变/);
});
test('换批不重复、耗尽不自动循环，已投递及不感兴趣岗位排除',()=>{
 const jobs=Array.from({length:25},(_,i)=>({id:String(i)}));const first=nextDiscoveryBatch(jobs,new Set());assert.equal(first.length,12);
 const second=nextDiscoveryBatch(jobs,new Set(first.map(x=>x.id)));assert.equal(second.length,12);assert.equal(second[0].id,'12');
 assert.deepEqual(nextDiscoveryBatch(jobs,new Set(jobs.map(x=>x.id))),[]);
 assert.ok(!recommendable({isApplied:true,isDismissed:false}));assert.ok(!recommendable({isApplied:false,isDismissed:true}));assert.ok(!recommendable({isApplied:false,isDismissed:false,availabilityStatus:'possibly_closed'}));
});

test('官网招聘类型与经理岗位矛盾时不当作实习推荐',()=>{
 const source=AUTOMATIC_SOURCES.find(s=>s.id==='casetify')!;
 const job=feedRowToJob(source,{id:123,title:'E-commerce Operations Manager',content:'Manage a team',location:{name:'Shenzhen'},metadata:[{name:'Employment Type',value:'Intern'}]});
 assert.equal(job.availabilityStatus,'needs_confirmation');assert.equal(matchesFeedScope(job,['深圳']),false);
});

test('OPPO 公开接口岗位保留毕业要求、发布日期和官网链接',()=>{
 const source=AUTOMATIC_SOURCES.find(s=>s.id==='oppo')!;
 const job=feedRowToJob(source,{idProjPosition:1599,projectName:'2027届寻梦实习招聘',recruitmentType:'Intern',recruitmentTypeName:'实习生',positionName:'互联网运营实习生',positionDesc:'负责用户与内容运营',positionRequire:'熟悉数据分析',workCityName:'深圳市',releaseTime:'2026-03-06',graduationRequirement:'2026年9月-2027年12月的港澳台及海外院校毕业生'});
 assert.equal(job.company,'OPPO');assert.equal(job.recruitmentType,'实习');assert.equal(job.publishedDate,'2026-03-06');
 assert.match(job.rawText!,/毕业生/);assert.equal(job.jobUrl,'https://careers.oppo.com/university/oppo/campus/post/1599?recruitType=Intern');
});
