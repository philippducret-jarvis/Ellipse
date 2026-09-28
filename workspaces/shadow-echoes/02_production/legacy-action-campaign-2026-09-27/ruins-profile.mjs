import {beginRun,finishRun,heroBonuses,readProfile,saveProfile} from './profile.mjs';
import {PARTY} from './ruins-rules.mjs';

export function ruinsBonuses(storage){
 const {profile}=readProfile(storage);
 return Object.fromEntries(PARTY.map(id=>[id,heroBonuses(profile,id)]));
}

export function startRuinsRun(storage,runId){
 const state=readProfile(storage);
 if(state.unavailable||state.recovered)return {ok:false,reason:state.recovered?'invalid':'unavailable'};
 beginRun(state.profile,'campaign',runId);
 if(!saveProfile(storage,state.profile))return {ok:false,reason:'unavailable'};
 return {ok:true};
}

export function finishRuinsRun(storage,runId,won,{time=0,survivors=0}={}){
 const state=readProfile(storage);
 if(state.unavailable||state.recovered)return {ok:false,reason:state.recovered?'invalid':'unavailable'};
 const score=Math.max(0,Math.round(10000-Math.max(0,time)*30+Math.max(0,survivors)*500));
 const reward=finishRun(state.profile,runId,won,score);
 if(!reward)return {ok:false,reason:'replaced'};
 if(!saveProfile(storage,state.profile))return {ok:false,reason:'unavailable'};
 return {ok:true,reward,score};
}
