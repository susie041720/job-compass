export function nextDiscoveryBatch<T extends {id:string}>(jobs:T[],seen:ReadonlySet<string>,size=12):T[] {
  return jobs.filter(job=>!seen.has(job.id)).slice(0,size);
}
export function recommendable(job:{isApplied:boolean;isDismissed:boolean;availabilityStatus?:string}) {
  return !job.isApplied && !job.isDismissed && (!job.availabilityStatus || job.availabilityStatus === 'active');
}
