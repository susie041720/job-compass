import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAssessment, validateAssessments, readAssessments, statusLabel} from '../lib/assessments.ts';
import {suggestCategories, ALL_CATEGORIES} from '../lib/job-categories.ts';

test('考核序列往返保留 OA、视频、AI、真人面试及轮次',()=>{
 const rows=['线上测评（OA）','录制视频面试','AI 面试','真人面试'].map((type,index)=>({...emptyAssessment(),type,round:`第${index+1}轮`,notes:'保留历史',scheduledAt:'2026-12-20T14:00'}));
 assert.deepEqual(readAssessments(JSON.stringify(rows)),rows);
 assert.equal(statusLabel('笔试'),'测评／笔试');
});
test('拒绝重复编号、错误类型、非法时间、脚本链接，允许日期空白',()=>{
 const row=emptyAssessment();
 assert.equal(validateAssessments([row]).length,1);
 for(const rows of [[row,row],[{...row,type:'invalid'}],[{...row,scheduledAt:'oops'}],[{...row,link:'javascript:alert(1)'}]]) assert.throws(()=>validateAssessments(rows));
 assert.throws(()=>validateAssessments({}));
});
test('岗位标题优先于通用技能，不把有 SQL 要求的运营归成数据分析',()=>{
 const result=suggestCategories('用户运营实习生','要求 SQL 和数据分析');
 assert.equal(result[0].category,'用户运营');
 assert.ok(result[0].evidence.includes('用户运营'));
 assert.ok(result.every(item=>ALL_CATEGORIES.includes(item.category)));
});
test('四大审计、英文商业分析可分类，模糊岗位不编造建议',()=>{
 assert.equal(suggestCategories('Audit Intern')[0].category,'审计');
 assert.equal(suggestCategories('Business Analyst Intern')[0].category,'商业分析');
 assert.deepEqual(suggestCategories('实习生','认真负责'),[]);
});
