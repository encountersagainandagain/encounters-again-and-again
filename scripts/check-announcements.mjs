// Announcements: they retire by themselves after their last day, and the sign-up button takes a link or an email as
// the editor writes it, or shows nothing.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-ann-'));fs.copyFileSync('src/features/encounters/announcements.ts',path.join(tmp,'announcements.ts'));
const {announcementShown,signupLink,announceable}=await import(pathToFileURL(path.join(tmp,'announcements.ts')).href);
const today='2026-10-31';
assert.equal(announcementShown({starts_on:'2026-10-31'},today),true,'shown on its day');
assert.equal(announcementShown({starts_on:'2026-10-30'},today),false,'gone the day after');
assert.equal(announcementShown({starts_on:'2026-10-20',ends_on:'2026-11-05'},today),true,'shown until its last day');
assert.equal(announcementShown({starts_on:'2026-10-20',ends_on:'2026-10-30'},today),false);
assert.equal(announcementShown({},today),true,'no date: until unpublished');
assert.equal(announcementShown({starts_on:null,ends_on:null},today),true);
const cases=[
  ['https://forms.gle/abc',{href:'https://forms.gle/abc',external:true}],['eventbrite.com/e/reef-night',{href:'https://eventbrite.com/e/reef-night',external:true}],
  ['hello@encounters.org',{href:'mailto:hello@encounters.org?subject=Book%20launch',external:false}],['mailto:hello@encounters.org',{href:'mailto:hello@encounters.org?subject=Book%20launch',external:false}],
  ['/contact',{href:'/contact',external:false}],['',null],['  ',null],['sign up here',null],['javascript:alert(1)',null],['//evil.com',null],['http://',null],
];
for(const [v,want] of cases)assert.deepEqual(signupLink(v,'Book launch'),want,v);
assert.deepEqual(signupLink('hello@encounters.org'),{href:'mailto:hello@encounters.org',external:false});
assert.ok(!announceable.includes('expedition')&&!announceable.includes('workshop'),'activities are in What is coming by themselves');
console.log('announcements ok');
